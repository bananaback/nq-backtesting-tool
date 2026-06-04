import type { RefObject, Dispatch, SetStateAction } from 'react'
import type { ChartRuntimeState, Drawing, DrawMenuState, EntryDirection, Timeframe } from '../chartTypes'
import { computeEntryStatus, getDefaultFibLevels, getDrawingLengthMinutes, getFibLevelPrice, getIndexByTime, getTimeframeMinutes, snapPriceToCandleOHLC } from '../chartUtils'

type TradingChartWindowDeps = {
    chartCanvasRef: RefObject<HTMLCanvasElement | null>
    runtimeRef: RefObject<ChartRuntimeState>
    currentTfRef: RefObject<Timeframe>
    drawModeRef: RefObject<boolean>
    drawMenuOpenRef: RefObject<boolean>
    setDrawMenu: Dispatch<SetStateAction<DrawMenuState>>
    setDrawings: Dispatch<SetStateAction<ChartRuntimeState['drawings']>>
    drawCanvas: () => void
    resizeCanvas: () => void
    setSelectedDrawingId: Dispatch<SetStateAction<number | null>>
    setFibPlacementStep: Dispatch<SetStateAction<'pick-first' | 'pick-second' | null>>
    cancelFibPlacement: () => void
    setEntryPlacementStep: Dispatch<SetStateAction<'pick-entry' | 'pick-sl' | 'pick-tp' | 'pick-width' | null>>
    cancelEntryPlacement: () => void
    removeDrawing: (id: number) => void
    setCandleFilterMinute: Dispatch<SetStateAction<string>>
    setRenderAfterFilterMinute: Dispatch<SetStateAction<boolean>>
    setIsPickingCandleFilter: Dispatch<SetStateAction<boolean>>
}

export function bindTradingChartWindowEvents({
    chartCanvasRef,
    runtimeRef,
    currentTfRef,
    drawModeRef,
    drawMenuOpenRef,
    setDrawMenu,
    setDrawings,
    drawCanvas,
    resizeCanvas,
    setSelectedDrawingId,
    setFibPlacementStep,
    cancelFibPlacement,
    setEntryPlacementStep,
    cancelEntryPlacement,
    removeDrawing,
    setCandleFilterMinute,
    setRenderAfterFilterMinute,
    setIsPickingCandleFilter,
}: TradingChartWindowDeps) {
    resizeCanvas()

    const handleResize = () => resizeCanvas()
    const handleMouseMove = (event: globalThis.MouseEvent) => {
        const chartCanvas = chartCanvasRef.current
        if (!chartCanvas) return

        const runtime = runtimeRef.current
        const chartRect = chartCanvas.getBoundingClientRect()
        runtime.crosshairActive = event.clientX >= chartRect.left && event.clientX <= chartRect.right && event.clientY >= chartRect.top && event.clientY <= chartRect.bottom
        if (runtime.crosshairActive) {
            runtime.crosshairX = event.clientX - chartRect.left
            runtime.crosshairY = event.clientY - chartRect.top
        }

        const data = runtime.chartData[currentTfRef.current]
        if (runtime.isDraggingChart && data.length) {
            const dx = event.clientX - runtime.lastX
            const dy = event.clientY - runtime.lastY
            const candleSpace = chartCanvas.width / Math.max(1, runtime.visibleCount)

            runtime.viewStart -= dx / candleSpace
            const pricePerPixel = (runtime.manualMaxP - runtime.manualMinP) / chartCanvas.height
            runtime.manualMaxP += dy * pricePerPixel
            runtime.manualMinP += dy * pricePerPixel
            runtime.isAutoScaled = false

            if (runtime.viewStart < -runtime.visibleCount / 2) runtime.viewStart = -runtime.visibleCount / 2
            if (runtime.viewStart > data.length - runtime.visibleCount / 2) runtime.viewStart = data.length - runtime.visibleCount / 2

            runtime.lastX = event.clientX
            runtime.lastY = event.clientY
        }

        if (runtime.isDraggingAxis && data.length) {
            runtime.isAutoScaled = false
            const dy = event.clientY - runtime.lastY
            const scaleFactor = 1 + dy * 0.01
            const center = (runtime.manualMaxP + runtime.manualMinP) / 2

            runtime.manualMaxP = center + (runtime.manualMaxP - center) * scaleFactor
            runtime.manualMinP = center - (center - runtime.manualMinP) * scaleFactor
            runtime.lastY = event.clientY
        }

        if (data.length) drawCanvas()
    }

    const handleMouseUp = (event: globalThis.MouseEvent) => {
        const runtime = runtimeRef.current
        const chartCanvas = chartCanvasRef.current
        const dx = event.clientX - runtime.mouseDownX
        const dy = event.clientY - runtime.mouseDownY
        const data = runtime.chartData[currentTfRef.current]

        if (runtime.pendingCandleFilterPick && Math.abs(dx) < 3 && Math.abs(dy) < 3 && chartCanvas) {
            const chartRect = chartCanvas.getBoundingClientRect()
            const candleSpace = chartCanvas.width / Math.max(1, runtime.visibleCount)
            const hoverIndex = Math.floor(runtime.viewStart + (event.clientX - chartRect.left) / candleSpace)

            if (hoverIndex >= 0 && hoverIndex < data.length) {
                const rawTime = data[hoverIndex].time
                const normalized = rawTime.includes(' ') ? rawTime.replace(' ', 'T') : rawTime
                const parsed = new Date(normalized)
                const minuteValue = Number.isNaN(parsed.getTime())
                    ? normalized.slice(0, 16)
                    : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}T${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`

                runtime.candleFilterMinute = minuteValue
                runtime.renderAfterFilterMinute = false
                runtime.pendingCandleFilterPick = false
                setCandleFilterMinute(minuteValue)
                setRenderAfterFilterMinute(false)
                setIsPickingCandleFilter(false)
                drawCanvas()
                return
            }
        }

        if (drawModeRef.current && Math.abs(dx) < 3 && Math.abs(dy) < 3 && chartCanvas) {
            const chartRect = chartCanvas.getBoundingClientRect()
            const candleSpace = chartCanvas.width / Math.max(1, runtime.visibleCount)
            const hoverIndex = Math.floor(runtime.viewStart + (event.clientX - chartRect.left) / candleSpace)

            if (hoverIndex >= 0 && hoverIndex < data.length) {
                // Find the last visible candle index (at or before replay cutoff)
                let lastVisibleIndex = data.length - 1
                if (runtime.candleFilterMinute && !runtime.renderAfterFilterMinute) {
                    const normalized = runtime.candleFilterMinute.includes(' ')
                        ? runtime.candleFilterMinute.replace(' ', 'T')
                        : runtime.candleFilterMinute
                    const cutoffEpoch = new Date(normalized).getTime()
                    for (let i = data.length - 1; i >= 0; i--) {
                        const candleTime = data[i].time.includes(' ') ? data[i].time.replace(' ', 'T') : data[i].time
                        const candleEpoch = new Date(candleTime).getTime()
                        if (candleEpoch <= cutoffEpoch) {
                            lastVisibleIndex = i
                            break
                        }
                    }
                }
                // Clamp hoverIndex to not exceed last visible candle
                const clampedIndex = Math.min(hoverIndex, lastVisibleIndex)
                const candle = data[clampedIndex]
                const priceRange = runtime.manualMaxP - runtime.manualMinP || 1
                const cursorPrice = runtime.manualMaxP - ((event.clientY - chartRect.top) / chartCanvas.height) * priceRange
                const snappedPrice = snapPriceToCandleOHLC(candle, cursorPrice)

                if (runtime.pendingFibPlacement) {
                    const pending = runtime.pendingFibPlacement
                    if (pending.firstPoint) {
                        const newId = runtime.drawingIdCounter
                        const nextDrawing = {
                            id: newId,
                            type: 'FIB' as const,
                            time: pending.firstPoint.time,
                            time2: candle.time,
                            price1: pending.firstPoint.price,
                            price2: snappedPrice,
                            templateKey: pending.templateKey,
                            extendRight: false,
                            reverse: false,
                            lineStyle: 'normal' as const,
                            lineWidth: 1.5,
                            levels: getDefaultFibLevels(pending.templateKey),
                        }
                        runtime.drawingIdCounter += 1
                        runtime.drawings = [...runtime.drawings, nextDrawing]
                        runtime.selectedDrawingId = newId
                        setDrawings(runtime.drawings)
                        setSelectedDrawingId(newId)
                        setFibPlacementStep(null)
                        cancelFibPlacement()
                        runtime.isDraggingChart = false
                        runtime.isDraggingAxis = false
                        if (chartCanvas) chartCanvas.style.cursor = 'crosshair'
                        drawCanvas()
                        return
                    }

                    runtime.pendingFibPlacement = {
                        firstPoint: { time: candle.time, price: snappedPrice },
                        templateKey: pending.templateKey,
                    }
                    setFibPlacementStep('pick-second')
                    runtime.isDraggingChart = false
                    runtime.isDraggingAxis = false
                    if (chartCanvas) chartCanvas.style.cursor = 'crosshair'
                    drawCanvas()
                    return
                }

                if (runtime.pendingEntryPlacement) {
                    const pending = runtime.pendingEntryPlacement
                    if (!pending.firstPoint) {
                        // Click 1: set entry point
                        runtime.pendingEntryPlacement = {
                            ...pending,
                            firstPoint: { time: candle.time, price: snappedPrice },
                        }
                        setEntryPlacementStep('pick-sl')
                        drawCanvas()
                        return
                    }
                    if (!pending.secondPoint) {
                        // Click 2: set stop loss point
                        const entryPrice = pending.firstPoint.price
                        const stopLossPrice = snappedPrice
                        if (stopLossPrice === entryPrice) {
                            window.alert('Stop loss cannot equal entry price.')
                            return
                        }
                        runtime.pendingEntryPlacement = {
                            ...pending,
                            secondPoint: { time: candle.time, price: stopLossPrice },
                        }
                        setEntryPlacementStep('pick-tp')
                        drawCanvas()
                        return
                    }
                    if (!pending.thirdPoint) {
                        // Click 3: set take profit point → transition to 'pick-width'
                        const entryPriceClick3 = pending.firstPoint.price
                        const stopLossPriceClick3 = pending.secondPoint.price
                        const takeProfitPrice = snappedPrice
                        const inferredDirectionClick3: EntryDirection = stopLossPriceClick3 < entryPriceClick3 ? 'LONG' : 'SHORT'
                        if (inferredDirectionClick3 === 'LONG' && takeProfitPrice <= entryPriceClick3) {
                            window.alert('LONG take profit must be above entry price.')
                            return
                        }
                        if (inferredDirectionClick3 === 'SHORT' && takeProfitPrice >= entryPriceClick3) {
                            window.alert('SHORT take profit must be below entry price.')
                            return
                        }
                        runtime.pendingEntryPlacement = {
                            ...pending,
                            thirdPoint: { time: candle.time, price: takeProfitPrice },
                        }
                        setEntryPlacementStep('pick-width')
                        drawCanvas()
                        return
                    }
                    // Click 4: set width → compute status and finalize drawing
                    const entryPrice = pending.firstPoint.price
                    const stopLossPrice = pending.secondPoint.price
                    const takeProfitPrice = pending.thirdPoint.price
                    const inferredDirection: EntryDirection = stopLossPrice < entryPrice ? 'LONG' : 'SHORT'
                    const entryIndex = getIndexByTime(data, pending.firstPoint.time)
                    const widthInCandles = Math.max(1, hoverIndex - entryIndex)
                    const timeframeMinutes = getTimeframeMinutes(currentTfRef.current)
                    const lengthMinutes = widthInCandles * timeframeMinutes
                    const status = computeEntryStatus(data, entryIndex, widthInCandles, inferredDirection, stopLossPrice, takeProfitPrice)
                    const newId = runtime.drawingIdCounter
                    const nextDrawing: Drawing = {
                        id: newId,
                        type: 'ENTRY',
                        time: pending.firstPoint.time,
                        entryPrice,
                        stopLossPrice,
                        takeProfitPrice,
                        direction: inferredDirection,
                        status,
                        widthInCandles,
                        lengthMinutes,
                    }
                    runtime.drawingIdCounter += 1
                    runtime.drawings = [...runtime.drawings, nextDrawing]
                    runtime.selectedDrawingId = newId
                    setDrawings(runtime.drawings)
                    setSelectedDrawingId(newId)
                    runtime.pendingEntryPlacement = null
                    setEntryPlacementStep(null)
                    runtime.isDraggingChart = false
                    runtime.isDraggingAxis = false
                    if (chartCanvas) chartCanvas.style.cursor = 'crosshair'
                    drawCanvas()
                    return
                }

                runtime.selectedCandleIndex = hoverIndex
                drawMenuOpenRef.current = true
                setDrawMenu({ x: event.clientX - chartRect.left, y: event.clientY - chartRect.top })
            }
        }

        if (drawModeRef.current && Math.abs(dx) < 3 && Math.abs(dy) < 3 && !drawMenuOpenRef.current && chartCanvas) {
            const chartRect = chartCanvas.getBoundingClientRect()
            const candleSpace = chartCanvas.width / Math.max(1, runtime.visibleCount)
            const hoverIndex = Math.floor(runtime.viewStart + (event.clientX - chartRect.left) / candleSpace)

            if (hoverIndex >= 0 && hoverIndex < data.length) {
                runtime.selectedCandleIndex = hoverIndex
                drawMenuOpenRef.current = true
                setDrawMenu({ x: event.clientX - chartRect.left, y: event.clientY - chartRect.top })
            }
        }

        // selection: when not in draw mode, a click near an annotation selects it
        if (!drawModeRef.current && Math.abs(dx) < 6 && Math.abs(dy) < 6 && chartCanvas) {
            const data = runtime.chartData[currentTfRef.current]
            const chartRect = chartCanvas.getBoundingClientRect()
            const candleSpace = chartCanvas.width / Math.max(1, runtime.visibleCount)
            const cursorX = event.clientX - chartRect.left
            const cursorY = event.clientY - chartRect.top

            const priceRange = runtime.manualMaxP - runtime.manualMinP || 1
            const getY = (price: number) => chartCanvas.height - ((price - runtime.manualMinP) / priceRange) * chartCanvas.height

            let bestId: number | null = null
            const timeframeMinutes = getTimeframeMinutes(currentTfRef.current)
            for (let i = runtime.drawings.length - 1; i >= 0; i -= 1) {
                const tool = runtime.drawings[i]
                const idx = getIndexByTime(data, tool.time)
                if (idx === -1) continue
                const x = (idx - runtime.viewStart) * candleSpace + candleSpace / 2

                if (tool.type === 'VLINE') {
                    const dx = Math.abs(cursorX - x)
                    if (dx <= 12) {
                        bestId = tool.id
                        break
                    }
                    continue
                }

                if (tool.type === 'FIB') {
                    const index1 = getIndexByTime(data, tool.time)
                    const index2 = getIndexByTime(data, tool.time2)
                    if (index1 === -1 || index2 === -1) continue

                    const x1 = (index1 - runtime.viewStart) * candleSpace + candleSpace / 2
                    const x2 = (index2 - runtime.viewStart) * candleSpace + candleSpace / 2
                    const y1 = getY(tool.price1)
                    const y2 = getY(tool.price2)
                    const leftX = Math.min(x1, x2)
                    const rightX = Math.max(x1, x2)
                    const segX = x2 - x1
                    const segY = y2 - y1
                    const segLengthSq = segX * segX + segY * segY || 1
                    const rawT = ((cursorX - x1) * segX + (cursorY - y1) * segY) / segLengthSq
                    const t = Math.max(0, Math.min(1, rawT))
                    const projX = x1 + segX * t
                    const projY = y1 + segY * t

                    if (Math.hypot(cursorX - projX, cursorY - projY) <= 12) {
                        bestId = tool.id
                        break
                    }

                    for (const level of tool.levels) {
                        if (!level.visible) continue
                        const y = getY(getFibLevelPrice(tool, level.ratio))
                        const levelRightX = tool.extendRight ? chartCanvas.width : rightX
                        const onSegment = cursorX >= leftX && cursorX <= levelRightX
                        const dyLevel = Math.abs(cursorY - y)
                        if (onSegment && dyLevel <= 10) {
                            bestId = tool.id
                            break
                        }
                    }
                    if (bestId !== null) break
                    continue
                }

                if (tool.type === 'ENTRY') {
                    const entryY = getY(tool.entryPrice)
                    const slY = getY(tool.stopLossPrice)
                    const tpY = getY(tool.takeProfitPrice)
                    const effectiveWidthInCandles = tool.lengthMinutes
                        ? Math.max(1, Math.round(tool.lengthMinutes / timeframeMinutes))
                        : tool.widthInCandles
                    const widthEndX = (idx + effectiveWidthInCandles - runtime.viewStart) * candleSpace + candleSpace / 2
                    const rightX = Math.min(widthEndX, chartCanvas.width)
                    const dyEntry = Math.abs(cursorY - entryY)
                    const dySL = Math.abs(cursorY - slY)
                    const dyTP = Math.abs(cursorY - tpY)
                    if ((dyEntry <= 10 || dySL <= 10 || dyTP <= 10) && cursorX >= x - 5 && cursorX <= rightX) {
                        bestId = tool.id
                        break
                    }
                    continue
                }

                if (tool.type === 'FVG' || tool.type === 'ORG' || tool.type === 'NDOG' || tool.type === 'NWOG') {
                    const top = tool.top
                    const bot = tool.bot
                    const yTop = getY(top)
                    const yBot = getY(bot)
                    const yDraw = Math.min(yTop, yBot)
                    const height = Math.abs(yBot - yTop)
                    const lengthMinutes = getDrawingLengthMinutes(tool.lengthMinutes)
                    const rectWidth = lengthMinutes === null ? chartCanvas.width - x : Math.max(1, (lengthMinutes / timeframeMinutes) * candleSpace)
                    const rightX = x + rectWidth

                    if (cursorX >= x && cursorX <= rightX && cursorY >= yDraw && cursorY <= yDraw + height) {
                        bestId = tool.id
                        break
                    }
                    const dy = cursorY < yDraw ? yDraw - cursorY : cursorY > yDraw + height ? cursorY - (yDraw + height) : 0
                    const dx = cursorX < x ? x - cursorX : cursorX > rightX ? cursorX - rightX : 0
                    const dist = Math.hypot(dx, dy)
                    if (dist <= 18) {
                        bestId = tool.id
                        break
                    }
                    continue
                }

                if ('price' in tool) {
                    const y = getY(tool.price)
                    const lengthMinutes = getDrawingLengthMinutes(tool.lengthMinutes)
                    const rectWidth = lengthMinutes === null ? chartCanvas.width - x : Math.max(1, (lengthMinutes / timeframeMinutes) * candleSpace)
                    const rightX = x + rectWidth
                    const dy = Math.abs(cursorY - y)
                    if (dy <= 12 && cursorX >= x && cursorX <= rightX) {
                        bestId = tool.id
                        break
                    }
                }
            }

            runtime.selectedDrawingId = bestId
            setSelectedDrawingId(bestId)
        }

        runtime.isDraggingChart = false
        runtime.isDraggingAxis = false
        if (chartCanvas) chartCanvas.style.cursor = 'crosshair'
        drawCanvas()
    }

    const handleMouseDown = (event: globalThis.MouseEvent) => {
        const target = event.target as HTMLElement | null
        if (target?.closest('.draw-menu')) return
        if (!target?.closest('.chart-canvas')) {
            drawMenuOpenRef.current = false
            setDrawMenu(null)
        }
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
        const activeElement = document.activeElement as HTMLElement | null
        if (activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)) return

        if ((event.key === 'Backspace' || event.key === 'Delete') && runtimeRef.current.selectedDrawingId !== null) {
            event.preventDefault()
            removeDrawing(runtimeRef.current.selectedDrawingId)
            setSelectedDrawingId(null)
        }

        if (event.key === 'Escape' && runtimeRef.current.pendingFibPlacement) {
            event.preventDefault()
            cancelFibPlacement()
        }

        if (event.key === 'Escape' && runtimeRef.current.pendingEntryPlacement) {
            event.preventDefault()
            cancelEntryPlacement()
        }

        if (event.key === 'Escape' && runtimeRef.current.pendingCandleFilterPick) {
            event.preventDefault()
            runtimeRef.current.pendingCandleFilterPick = false
            setIsPickingCandleFilter(false)
            drawCanvas()
        }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
        window.removeEventListener('mousedown', handleMouseDown)
        window.removeEventListener('keydown', handleKeyDown)
    }
}
