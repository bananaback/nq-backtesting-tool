import type { Dispatch, SetStateAction } from 'react'
import type { ChartRuntimeState, OhlcState, Timeframe } from './chartTypes'
import { getDrawingLengthMinutes, getFibLevelPrice, getFibLineDash, getIndexByTime, getTimeframeMinutes, isMidnightCandle, snapPriceToCandleOHLC } from './chartUtils'
import { drawCrosshairOverlay } from './chartCrosshair'

type DrawTradingChartArgs = {
    chartCanvas: HTMLCanvasElement
    yAxisCanvas: HTMLCanvasElement
    xAxisCanvas: HTMLCanvasElement
    runtime: ChartRuntimeState
    currentTF: Timeframe
    drawMenuOpen: boolean
    setOhlc: Dispatch<SetStateAction<OhlcState>>
}

type FibRenderLevel = {
    ratio: number
    label: string
    color: string
    visible: boolean
}

type FibRenderDrawing = {
    time: string
    time2: string
    price1: number
    price2: number
    extendRight: boolean
    reverse: boolean
    lineStyle: 'normal' | 'dashed' | 'dotted'
    lineWidth: number
    levels: FibRenderLevel[]
}

function drawFibDrawing(
    ctx: CanvasRenderingContext2D,
    chartCanvas: HTMLCanvasElement,
    runtime: ChartRuntimeState,
    data: ChartRuntimeState['chartData'][Timeframe],
    candleSpace: number,
    getY: (price: number) => number,
    fibTool: FibRenderDrawing,
    isSelected: boolean,
) {
    const index1 = getIndexByTime(data, fibTool.time)
    const index2 = getIndexByTime(data, fibTool.time2)
    if (index1 === -1 || index2 === -1) return

    const x1 = (index1 - runtime.viewStart) * candleSpace + candleSpace / 2
    const x2 = (index2 - runtime.viewStart) * candleSpace + candleSpace / 2
    const y1 = getY(fibTool.price1)
    const y2 = getY(fibTool.price2)
    const leftX = Math.min(x1, x2)
    const rightX = Math.max(x1, x2)
    const drawRightX = fibTool.extendRight ? chartCanvas.width : rightX
    const levels = fibTool.levels.filter((level) => level.visible)
    const dash = getFibLineDash(fibTool.lineStyle)
    const baseLineWidth = Number.isFinite(fibTool.lineWidth) ? Math.max(0.5, fibTool.lineWidth) : 1.5

    ctx.save()
    ctx.strokeStyle = '#000000'
    ctx.setLineDash(dash)
    ctx.lineWidth = isSelected ? baseLineWidth + 0.8 : baseLineWidth
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()

    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.arc(x1, y1, 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x2, y2, 2.5, 0, Math.PI * 2)
    ctx.fill()

    levels.forEach((level) => {
        const y = getY(getFibLevelPrice(fibTool, level.ratio))
        ctx.strokeStyle = level.color || '#000000'
        ctx.setLineDash(dash)
        ctx.lineWidth = baseLineWidth
        ctx.beginPath()
        ctx.moveTo(leftX, y)
        ctx.lineTo(drawRightX, y)
        ctx.stroke()

        ctx.fillStyle = level.color || '#000000'
        ctx.font = 'bold 10px sans-serif'
        ctx.fillText(level.label, drawRightX - 44, y - 4)
    })

    if (isSelected) {
        ctx.save()
        ctx.strokeStyle = '#6d28d9'
        ctx.setLineDash([6, 3])
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x1 - 2, y1 - 2)
        ctx.lineTo(x2 + 2, y2 + 2)
        ctx.stroke()
        ctx.restore()
    }

    ctx.restore()
}

export function drawTradingChart({
    chartCanvas,
    yAxisCanvas,
    xAxisCanvas,
    runtime,
    currentTF,
    drawMenuOpen,
    setOhlc,
}: DrawTradingChartArgs) {
    const ctx = chartCanvas.getContext('2d', { alpha: false })
    const yCtx = yAxisCanvas.getContext('2d')
    const xCtx = xAxisCanvas.getContext('2d')
    if (!ctx || !yCtx || !xCtx) return

    const data = runtime.chartData[currentTF]
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, chartCanvas.width, chartCanvas.height)
    yCtx.clearRect(0, 0, yAxisCanvas.width, yAxisCanvas.height)
    xCtx.clearRect(0, 0, xAxisCanvas.width, xAxisCanvas.height)

    if (!data.length) {
        setOhlc({ visible: false })
        return
    }

    const startIdx = Math.floor(Math.max(0, runtime.viewStart))
    const endIdx = Math.ceil(Math.min(data.length - 1, runtime.viewStart + runtime.visibleCount))
    const visibleData = data.slice(startIdx, endIdx + 1)
    if (!visibleData.length) {
        setOhlc({ visible: false })
        return
    }

    let currentMax = -Infinity
    let currentMin = Infinity
    visibleData.forEach((item) => {
        if (item.high > currentMax) currentMax = item.high
        if (item.low < currentMin) currentMin = item.low
    })

    let range = currentMax - currentMin
    if (range === 0) range = 1
    if (runtime.isAutoScaled) {
        runtime.manualMaxP = currentMax + range * 0.05
        runtime.manualMinP = currentMin - range * 0.05
    }

    const priceRange = runtime.manualMaxP - runtime.manualMinP || 1
    const candleSpace = chartCanvas.width / Math.max(1, runtime.visibleCount)
    const candleWidth = Math.max(1, candleSpace * 0.7)
    const timeframeMinutes = getTimeframeMinutes(currentTF)
    const getY = (price: number) => chartCanvas.height - ((price - runtime.manualMinP) / priceRange) * chartCanvas.height
    const filterCutoffEpoch = runtime.candleFilterMinute ? new Date(runtime.candleFilterMinute).getTime() : Number.NaN

    const shouldRenderCandle = (time: string) => {
        if (!Number.isFinite(filterCutoffEpoch)) return true
        const normalized = time.includes(' ') ? time.replace(' ', 'T') : time
        const candleEpoch = new Date(normalized).getTime()
        if (!Number.isFinite(candleEpoch)) return true
        if (candleEpoch <= filterCutoffEpoch) return true
        return runtime.renderAfterFilterMinute
    }

    if (runtime.showDaySeparators) {
        for (let i = Math.max(startIdx, 1); i <= endIdx; i += 1) {
            if (!isMidnightCandle(data[i].time)) continue

            const x = (i - runtime.viewStart) * candleSpace + candleSpace / 2
            const xLine = Math.floor(x) + 0.5

            ctx.save()
            ctx.setLineDash([2, 4])
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(xLine, 0)
            ctx.lineTo(xLine, chartCanvas.height)
            ctx.stroke()
            ctx.restore()

            xCtx.save()
            xCtx.setLineDash([2, 4])
            xCtx.strokeStyle = 'rgba(0, 0, 0, 0.22)'
            xCtx.lineWidth = 1
            xCtx.beginPath()
            xCtx.moveTo(xLine, 0)
            xCtx.lineTo(xLine, xAxisCanvas.height)
            xCtx.stroke()
            xCtx.restore()
        }
    }

    runtime.drawings.forEach((tool) => {
        const index = getIndexByTime(data, tool.time)
        if (index === -1) return

        const x = (index - runtime.viewStart) * candleSpace + candleSpace / 2

        const isSelected = runtime.selectedDrawingId === tool.id
        if (tool.type === 'VLINE') {
            ctx.save()
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)'
            ctx.lineWidth = 1
            ctx.setLineDash([2, 4])
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, chartCanvas.height)
            ctx.stroke()
            ctx.restore()
            if (isSelected) {
                ctx.save()
                ctx.strokeStyle = '#6d28d9'
                ctx.lineWidth = 1
                ctx.setLineDash([6, 3])
                ctx.beginPath()
                ctx.moveTo(x - 2, 0)
                ctx.lineTo(x - 2, chartCanvas.height)
                ctx.stroke()
                ctx.restore()
            }
            return
        }

        if (tool.type === 'FIB') {
            drawFibDrawing(ctx, chartCanvas, runtime, data, candleSpace, getY, tool as unknown as FibRenderDrawing, isSelected)
            return
        }

        if (tool.type === 'FVG') {
            const yTop = getY(tool.top)
            const yBot = getY(tool.bot)
            const height = Math.abs(yBot - yTop)
            const yDraw = Math.min(yTop, yBot)
            const lengthMinutes = getDrawingLengthMinutes(tool.lengthMinutes)
            const rectWidth = lengthMinutes === null ? chartCanvas.width - x : Math.max(1, (lengthMinutes / timeframeMinutes) * candleSpace)

            ctx.fillStyle = tool.color
            ctx.fillRect(x, yDraw, rectWidth, height)
            ctx.strokeStyle = tool.border
            ctx.lineWidth = isSelected ? 2 : 1
            ctx.strokeRect(x, yDraw, rectWidth, height)
            if (isSelected) {
                ctx.save()
                ctx.strokeStyle = '#6d28d9'
                ctx.lineWidth = 1
                ctx.setLineDash([6, 3])
                ctx.strokeRect(x - 2, yDraw - 2, rectWidth + 4, height + 4)
                ctx.restore()
            }
            return
        }

        if (tool.type === 'ORG' || tool.type === 'NDOG' || tool.type === 'NWOG') {
            const yTop = getY(tool.top)
            const yBot = getY(tool.bot)
            const height = Math.abs(yBot - yTop)
            const yDraw = Math.min(yTop, yBot)
            const isPremium = tool.price0930 > tool.price1614
            const fillColor = tool.type === 'ORG'
                ? (isPremium ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)')
                : (tool.fillColor ?? 'rgba(59, 130, 246, 0.14)')
            const borderColor = tool.type === 'ORG'
                ? (isPremium ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)')
                : (tool.borderColor ?? 'rgba(59, 130, 246, 0.65)')

            ctx.save()
            ctx.fillStyle = fillColor
            ctx.strokeStyle = borderColor

            const lengthMinutes = getDrawingLengthMinutes(tool.lengthMinutes)
            const rectWidth = lengthMinutes === null ? chartCanvas.width - x : Math.max(1, (lengthMinutes / timeframeMinutes) * candleSpace)

            ctx.setLineDash([2, 2])
            ctx.fillRect(x, yDraw, rectWidth, height)
            ctx.strokeRect(x, yDraw, rectWidth, height)
            if (isSelected) {
                ctx.save()
                ctx.strokeStyle = '#6d28d9'
                ctx.lineWidth = 1
                ctx.setLineDash([6, 3])
                ctx.strokeRect(x - 2, yDraw - 2, rectWidth + 4, height + 4)
                ctx.restore()
            }

            ctx.setLineDash([4, 4])
            ctx.lineWidth = 0.5
            const levels = [0.25, 0.5, 0.75]
            levels.forEach(lvl => {
                const yLvl = getY(tool.price1614 + (tool.price0930 - tool.price1614) * lvl)
                ctx.beginPath()
                ctx.moveTo(x, yLvl)
                ctx.lineTo(chartCanvas.width, yLvl)
                ctx.stroke()

                ctx.fillStyle = isPremium ? '#15803d' : '#b91c1c'
                ctx.font = '8px sans-serif'
                ctx.fillText(lvl.toString(), chartCanvas.width - 25, yLvl - 2)
            })

            ctx.fillStyle = tool.type === 'ORG' ? (isPremium ? '#15803d' : '#b91c1c') : (tool.borderColor ?? '#2563eb')
            ctx.font = 'bold 10px sans-serif'
            const label = tool.type === 'ORG' ? `${tool.type} (${isPremium ? 'Premium' : 'Discount'})` : tool.type
            ctx.fillText(label, x + 8, yDraw + 14)
            ctx.restore()
            return
        }

        if ('price' in tool) {
            const y = getY(tool.price)
            const lengthMinutes = getDrawingLengthMinutes(tool.lengthMinutes)
            const rectWidth = lengthMinutes === null ? chartCanvas.width - x : Math.max(1, (lengthMinutes / timeframeMinutes) * candleSpace)
            ctx.beginPath()
            ctx.moveTo(x, y)
            ctx.lineTo(x + rectWidth, y)
            ctx.strokeStyle = isSelected ? '#6d28d9' : tool.color
            ctx.lineWidth = isSelected ? 3 : 2
            ctx.stroke()
            if (!isSelected) {
                ctx.fillStyle = tool.color
                ctx.font = 'bold 10px sans-serif'
                ctx.fillText(tool.type, x + 4, y - 4)
            }
        }
    })

    const pendingFib = runtime.pendingFibPlacement
    if (pendingFib && !drawMenuOpen) {
        ctx.save()
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.8)'
        ctx.fillStyle = '#0f172a'
        ctx.setLineDash([5, 4])
        ctx.lineWidth = 1.5

        if (!pendingFib.firstPoint) {
            if (runtime.crosshairActive) {
                const hoverDataIndex = Math.round((runtime.crosshairX - candleSpace / 2) / candleSpace + runtime.viewStart)
                if (hoverDataIndex >= 0 && hoverDataIndex < data.length) {
                    const hoverCandle = data[hoverDataIndex]
                    const cursorPrice = runtime.manualMaxP - (runtime.crosshairY / chartCanvas.height) * priceRange
                    const firstPrice = snapPriceToCandleOHLC(hoverCandle, cursorPrice)
                    const firstX = (hoverDataIndex - runtime.viewStart) * candleSpace + candleSpace / 2
                    const firstY = getY(firstPrice)

                    ctx.beginPath()
                    ctx.arc(firstX, firstY, 3.5, 0, Math.PI * 2)
                    ctx.fill()
                }
            }

            ctx.setLineDash([])
            ctx.font = 'bold 11px sans-serif'
            ctx.fillStyle = '#0f172a'
            ctx.fillText('Fibonacci: click first anchor or press Esc to cancel', 12, 18)
            ctx.restore()
        } else {
            const firstIndex = getIndexByTime(data, pendingFib.firstPoint.time)
            if (firstIndex !== -1) {
                const firstX = (firstIndex - runtime.viewStart) * candleSpace + candleSpace / 2
                const firstY = getY(pendingFib.firstPoint.price)

                ctx.beginPath()
                ctx.arc(firstX, firstY, 3.5, 0, Math.PI * 2)
                ctx.fill()

                if (runtime.crosshairActive) {
                    const hoverDataIndex = Math.round((runtime.crosshairX - candleSpace / 2) / candleSpace + runtime.viewStart)
                    if (hoverDataIndex >= 0 && hoverDataIndex < data.length) {
                        const hoverCandle = data[hoverDataIndex]
                        const cursorPrice = runtime.manualMaxP - (runtime.crosshairY / chartCanvas.height) * priceRange
                        const secondPrice = snapPriceToCandleOHLC(hoverCandle, cursorPrice)
                        const secondX = (hoverDataIndex - runtime.viewStart) * candleSpace + candleSpace / 2
                        const secondY = getY(secondPrice)

                        ctx.beginPath()
                        ctx.moveTo(firstX, firstY)
                        ctx.lineTo(secondX, secondY)
                        ctx.stroke()

                        ctx.beginPath()
                        ctx.arc(secondX, secondY, 3.5, 0, Math.PI * 2)
                        ctx.fill()
                    }
                }
            }

            ctx.setLineDash([])
            ctx.font = 'bold 11px sans-serif'
            ctx.fillStyle = '#0f172a'
            ctx.fillText('Fibonacci: click second anchor or press Esc to cancel', 12, 18)
            ctx.restore()
        }
    }

    if (runtime.pendingCandleFilterPick && !drawMenuOpen) {
        ctx.save()
        ctx.setLineDash([])
        ctx.font = 'bold 11px sans-serif'
        ctx.fillStyle = '#0f172a'
        ctx.fillText('Candle Filter: click a candle to set cutoff time', 12, pendingFib ? 36 : 18)
        ctx.restore()
    }

    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1
    xCtx.fillStyle = '#6b7280'
    xCtx.font = '11px sans-serif'
    xCtx.textAlign = 'center'
    xCtx.textBaseline = 'middle'

    let lastDrawnTimeX = -100
    for (let i = startIdx; i <= endIdx; i += 1) {
        const candle = data[i]
        if (!shouldRenderCandle(candle.time)) continue
        const x = (i - runtime.viewStart) * candleSpace + candleSpace / 2
        const xLine = Math.floor(x) + 0.5

        if (x - lastDrawnTimeX > 100) {
            xCtx.fillText(candle.time.length >= 16 ? candle.time.substring(5, 16) : candle.time, xLine, xAxisCanvas.height / 2)
            lastDrawnTimeX = xLine
        }

        const yO = getY(candle.open)
        const yC = getY(candle.close)
        const yH = getY(candle.high)
        const yL = getY(candle.low)

        ctx.beginPath()
        ctx.moveTo(xLine, Math.floor(yH) + 0.5)
        ctx.lineTo(xLine, Math.floor(yL) + 0.5)
        ctx.strokeStyle = '#000000'
        ctx.stroke()

        const bullish = candle.close > candle.open
        ctx.fillStyle = bullish ? '#22c55e' : '#000000'
        const top = Math.floor(Math.min(yO, yC)) + 0.5
        const bottom = Math.floor(Math.max(yO, yC)) + 0.5
        const height = Math.max(1, bottom - top)
        const width = Math.floor(candleWidth)
        const xBody = Math.floor(x - width / 2) + 0.5
        ctx.fillRect(xBody, top, width, height)
        ctx.strokeRect(xBody, top, width, height)
    }

    yCtx.fillStyle = '#6b7280'
    yCtx.font = '11px sans-serif'
    yCtx.textBaseline = 'middle'
    for (let i = 1; i <= 5; i += 1) {
        const y = (yAxisCanvas.height / 6) * i
        yCtx.fillText((runtime.manualMaxP - (priceRange / 6) * i).toFixed(2), 10, y)
    }

    drawCrosshairOverlay({
        chartCanvas,
        yAxisCanvas,
        xAxisCanvas,
        runtime,
        visibleData,
        candleSpace,
        priceRange,
        drawMenuOpen,
        setOhlc,
    })
}