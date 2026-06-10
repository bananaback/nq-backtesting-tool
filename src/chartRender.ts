import type { Dispatch, SetStateAction } from 'react'
import type { ChartRuntimeState, EntryDrawing, EntryStatus, OhlcState, Timeframe } from './chartTypes'
import { getDrawingLengthMinutes, getEntryRR, getFibLevelPrice, getFibLineDash, getIndexByTime, getTimeframeMinutes, isMidnightCandle, snapPriceToCandleOHLC } from './chartUtils'
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

function drawEntryZones(
    ctx: CanvasRenderingContext2D,
    entryX: number,
    entryY: number,
    slY: number,
    tpY: number,
    chartRightX: number,
    isLong: boolean,
    isSelected: boolean,
    status: EntryStatus,
    currentY: number | null,
): void {
    // isLong used implicitly: zone logic uses Math.min/Math.max which handles both directions
    void isLong
    ctx.save()

    const SPLIT_COLORS = {
        realizedProfitFill: 'rgba(22, 163, 74, 0.22)',
        realizedProfitStroke: 'rgba(22, 163, 74, 0.45)',
        unrealizedProfitFill: 'rgba(34, 197, 94, 0.08)',
        unrealizedProfitStroke: 'rgba(34, 197, 94, 0.20)',
        potentialProfitFill: 'rgba(34, 197, 94, 0.10)',
        potentialProfitStroke: 'rgba(34, 197, 94, 0.22)',
        realizedLossFill: 'rgba(220, 38, 38, 0.22)',
        realizedLossStroke: 'rgba(220, 38, 38, 0.45)',
        unrealizedLossFill: 'rgba(239, 68, 68, 0.08)',
        unrealizedLossStroke: 'rgba(239, 68, 68, 0.20)',
        atRiskLossFill: 'rgba(239, 68, 68, 0.10)',
        atRiskLossStroke: 'rgba(239, 68, 68, 0.22)',
        neutralProfitFill: 'rgba(34, 197, 94, 0.10)',
        neutralProfitStroke: 'rgba(34, 197, 94, 0.22)',
        neutralLossFill: 'rgba(239, 68, 68, 0.10)',
        neutralLossStroke: 'rgba(239, 68, 68, 0.22)',
    }

    const STATUS_COLORS = {
        IN_PROGRESS: {
            profitFill: 'rgba(156, 163, 175, 0.12)',
            profitStroke: 'rgba(156, 163, 175, 0.25)',
            lossFill: 'rgba(156, 163, 175, 0.08)',
            lossStroke: 'rgba(156, 163, 175, 0.18)',
        },
        TP_HIT: {
            profitFill: 'rgba(34, 197, 94, 0.35)',
            profitStroke: 'rgba(22, 163, 74, 0.7)',
            lossFill: 'rgba(239, 68, 68, 0.05)',
            lossStroke: 'rgba(239, 68, 68, 0.1)',
        },
        SL_HIT: {
            profitFill: 'rgba(34, 197, 94, 0.05)',
            profitStroke: 'rgba(34, 197, 94, 0.1)',
            lossFill: 'rgba(220, 38, 38, 0.35)',
            lossStroke: 'rgba(185, 28, 28, 0.7)',
        },
    }

    // Helper to draw a single zone rect
    const drawRect = (y: number, height: number, fill: string, stroke: string) => {
        if (height <= 1) return
        ctx.fillStyle = fill
        ctx.fillRect(entryX, y, chartRightX - entryX, height)
        ctx.strokeStyle = stroke
        ctx.lineWidth = 1
        ctx.setLineDash([])
        ctx.strokeRect(entryX, y, chartRightX - entryX, height)
    }

    // Profit zone: between entryY and tpY
    const profitTop = Math.min(entryY, tpY)
    const profitBottom = Math.max(entryY, tpY)
    const profitHeight = profitBottom - profitTop

    // Loss zone: between entryY and slY
    const lossTop = Math.min(entryY, slY)
    const lossBottom = Math.max(entryY, slY)
    const lossHeight = lossBottom - lossTop

    if (currentY !== null && status === 'IN_PROGRESS') {
        const inProfitZone = currentY > profitTop && currentY < profitBottom
        const inLossZone = currentY > lossTop && currentY < lossBottom

        if (inProfitZone) {
            // Realized profit: entry to currentY (darker green)
            const rpTop = Math.min(entryY, currentY)
            const rpHeight = Math.abs(entryY - currentY)
            drawRect(rpTop, rpHeight, SPLIT_COLORS.realizedProfitFill, SPLIT_COLORS.realizedProfitStroke)

            // Unrealized profit: currentY to tpY (lighter green)
            const upTop = Math.min(currentY, tpY)
            const upHeight = Math.abs(currentY - tpY)
            drawRect(upTop, upHeight, SPLIT_COLORS.unrealizedProfitFill, SPLIT_COLORS.unrealizedProfitStroke)

            // Full loss zone: lighter red (at risk)
            if (lossHeight > 1) {
                drawRect(lossTop, lossHeight, SPLIT_COLORS.atRiskLossFill, SPLIT_COLORS.atRiskLossStroke)
            }
        } else if (inLossZone) {
            // Full profit zone: lighter green (potential)
            if (profitHeight > 1) {
                drawRect(profitTop, profitHeight, SPLIT_COLORS.potentialProfitFill, SPLIT_COLORS.potentialProfitStroke)
            }

            // Realized loss: entry to currentY (darker red)
            const rlTop = Math.min(entryY, currentY)
            const rlHeight = Math.abs(entryY - currentY)
            drawRect(rlTop, rlHeight, SPLIT_COLORS.realizedLossFill, SPLIT_COLORS.realizedLossStroke)

            // Unrealized loss: currentY to slY (lighter red)
            const ulTop = Math.min(currentY, slY)
            const ulHeight = Math.abs(currentY - slY)
            drawRect(ulTop, ulHeight, SPLIT_COLORS.unrealizedLossFill, SPLIT_COLORS.unrealizedLossStroke)
        } else {
            // At entry or outside — neutral light colors
            if (profitHeight > 1) {
                drawRect(profitTop, profitHeight, SPLIT_COLORS.neutralProfitFill, SPLIT_COLORS.neutralProfitStroke)
            }
            if (lossHeight > 1) {
                drawRect(lossTop, lossHeight, SPLIT_COLORS.neutralLossFill, SPLIT_COLORS.neutralLossStroke)
            }
        }
    } else {
        const colors = STATUS_COLORS[status]
        if (profitHeight > 1) {
            drawRect(profitTop, profitHeight, colors.profitFill, colors.profitStroke)
        }
        if (lossHeight > 1) {
            drawRect(lossTop, lossHeight, colors.lossFill, colors.lossStroke)
        }
    }

    // Selected: purple dashed outline around combined zone
    if (isSelected) {
        const combinedTop = Math.min(profitTop, lossTop)
        const combinedBottom = Math.max(profitBottom, lossBottom)
        const combinedHeight = combinedBottom - combinedTop
        if (combinedHeight > 1) {
            ctx.strokeStyle = '#6d28d9'
            ctx.lineWidth = 1
            ctx.setLineDash([6, 3])
            ctx.strokeRect(entryX - 2, combinedTop - 2, chartRightX - entryX + 4, combinedHeight + 4)
        }
    }

    ctx.restore()
}

function drawEntryAxisTabs(
    yCtx: CanvasRenderingContext2D,
    yAxisCanvas: HTMLCanvasElement,
    entryY: number,
    slY: number,
    tpY: number,
    entryPrice: number,
    slPrice: number,
    tpPrice: number,
    isLong: boolean,
    isSelected: boolean,
    status: EntryStatus,
): void {
    const TAB_COLORS = {
        IN_PROGRESS: { entry: '#6b7280', sl: '#9ca3af', tp: '#9ca3af' },
        TP_HIT: { entry: '#22c55e', sl: '#ef4444', tp: '#16a34a' },
        SL_HIT: { entry: '#dc2626', sl: '#b91c1c', tp: '#86efac' },
    }
    const tabColors = TAB_COLORS[status]
    void isLong

    const tabs = [
        { y: entryY, price: entryPrice, color: tabColors.entry, label: 'E' },
        { y: slY, price: slPrice, color: tabColors.sl, label: 'SL' },
        { y: tpY, price: tpPrice, color: tabColors.tp, label: 'TP' },
    ]

    yCtx.save()
    yCtx.textBaseline = 'middle'

    tabs.forEach((tab) => {
        const tabY = Math.max(9, Math.min(yAxisCanvas.height - 9, tab.y))
        const tabWidth = 60
        const tabHeight = 18
        const radius = 4
        const tabX = 0

        // Rounded rectangle
        yCtx.fillStyle = tab.color
        yCtx.beginPath()
        yCtx.moveTo(tabX + radius, tabY - tabHeight / 2)
        yCtx.lineTo(tabX + tabWidth - radius, tabY - tabHeight / 2)
        yCtx.quadraticCurveTo(tabX + tabWidth, tabY - tabHeight / 2, tabX + tabWidth, tabY - tabHeight / 2 + radius)
        yCtx.lineTo(tabX + tabWidth, tabY + tabHeight / 2 - radius)
        yCtx.quadraticCurveTo(tabX + tabWidth, tabY + tabHeight / 2, tabX + tabWidth - radius, tabY + tabHeight / 2)
        yCtx.lineTo(tabX + radius, tabY + tabHeight / 2)
        yCtx.quadraticCurveTo(tabX, tabY + tabHeight / 2, tabX, tabY + tabHeight / 2 - radius)
        yCtx.lineTo(tabX, tabY - tabHeight / 2 + radius)
        yCtx.quadraticCurveTo(tabX, tabY - tabHeight / 2, tabX + radius, tabY - tabHeight / 2)
        yCtx.closePath()
        yCtx.fill()

        // Selected border
        if (isSelected) {
            yCtx.strokeStyle = '#6d28d9'
            yCtx.lineWidth = 2
            yCtx.setLineDash([])
            yCtx.stroke()
        }

        // White label text
        yCtx.fillStyle = '#ffffff'
        yCtx.font = 'bold 9px sans-serif'
        yCtx.fillText(`${tab.label} ${tab.price.toFixed(2)}`, tabX + 4, tabY)
    })

    yCtx.restore()
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
    // Precompute last candle index within filter cutoff (avoids O(n) scan per drawing/mouse-move)
    let candleFilterLastIndex = data.length - 1
    if (runtime.candleFilterMinute && !runtime.renderAfterFilterMinute) {
        const normalized = runtime.candleFilterMinute.includes(' ')
            ? runtime.candleFilterMinute.replace(' ', 'T')
            : runtime.candleFilterMinute
        const cutoffEpochMs = new Date(normalized).getTime()
        // Binary search: find last index where candle epoch <= cutoff
        let lo = 0
        let hi = data.length - 1
        while (lo <= hi) {
            const mid = (lo + hi) >>> 1
            const t = data[mid].time
            const norm = t.includes(' ') ? t.replace(' ', 'T') : t
            const epoch = new Date(norm).getTime()
            if (epoch <= cutoffEpochMs) {
                candleFilterLastIndex = mid
                lo = mid + 1
            } else {
                hi = mid - 1
            }
        }
    }

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

    const entryDrawingsRender: Array<{
        entryY: number
        slY: number
        tpY: number
        entryPrice: number
        slPrice: number
        tpPrice: number
        isLong: boolean
        isSelected: boolean
        status: EntryStatus
        widthEndX: number
    }> = []

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

        if (tool.type === 'ENTRY') {
            const entryTool = tool as EntryDrawing
            const entryY = getY(entryTool.entryPrice)
            const slY = getY(entryTool.stopLossPrice)
            const tpY = getY(entryTool.takeProfitPrice)
            const effectiveWidthInCandles = entryTool.lengthMinutes
                ? Math.max(1, Math.round(entryTool.lengthMinutes / timeframeMinutes))
                : entryTool.widthInCandles
            const widthEndX = x + effectiveWidthInCandles * candleSpace
            const rightX = Math.min(widthEndX, chartCanvas.width)
            const isLong = entryTool.direction === 'LONG'

            // Calculate the last candle index within the width boundary
            const widthEndIndex = Math.min(index + effectiveWidthInCandles, data.length - 1)

            // Find the last visible candle within the width boundary
            let lastVisibleIndexInWidth = -1
            for (let i = widthEndIndex; i >= index; i--) {
                if (shouldRenderCandle(data[i].time)) {
                    lastVisibleIndexInWidth = i
                    break
                }
            }

            // Dynamically calculate status based on visible candles within width
            let dynamicStatus: EntryStatus = 'IN_PROGRESS'
            if (lastVisibleIndexInWidth > index) {
                for (let i = index + 1; i <= lastVisibleIndexInWidth; i++) {
                    const candle = data[i]
                    if (isLong) {
                        if (candle.low <= entryTool.stopLossPrice) {
                            dynamicStatus = 'SL_HIT'
                            break
                        }
                        if (candle.high >= entryTool.takeProfitPrice) {
                            dynamicStatus = 'TP_HIT'
                            break
                        }
                    } else {
                        if (candle.high >= entryTool.stopLossPrice) {
                            dynamicStatus = 'SL_HIT'
                            break
                        }
                        if (candle.low <= entryTool.takeProfitPrice) {
                            dynamicStatus = 'TP_HIT'
                            break
                        }
                    }
                }
            }

            // Use the dynamic status for rendering
            const statusToUse = dynamicStatus

            // Compute current price position for IN_PROGRESS split zone coloring
            let currentY: number | null = null
            if (statusToUse === 'IN_PROGRESS' && lastVisibleIndexInWidth > index) {
                currentY = getY(data[lastVisibleIndexInWidth].close)
            }

            // Draw semi-transparent zones (bounded by widthInCandles)
            drawEntryZones(ctx, x, entryY, slY, tpY, rightX, isLong, isSelected, statusToUse, currentY)

            ctx.save()

            // Status-based line colors
            const STATUS_LINE_COLORS = {
                IN_PROGRESS: { entry: '#9ca3af', sl: '#9ca3af', tp: '#9ca3af' },
                TP_HIT: { entry: '#16a34a', sl: '#ef4444', tp: '#22c55e' },
                SL_HIT: { entry: '#dc2626', sl: '#b91c1c', tp: '#86efac' },
            }
            const lineColors = STATUS_LINE_COLORS[statusToUse]

            // Entry line: solid, colored by status
            ctx.beginPath()
            ctx.moveTo(x, entryY)
            ctx.lineTo(rightX, entryY)
            ctx.strokeStyle = isSelected ? '#6d28d9' : lineColors.entry
            ctx.lineWidth = isSelected ? 2.5 : 1.5
            ctx.setLineDash([])
            ctx.stroke()

            // SL line: dashed [4,4], colored by status
            ctx.beginPath()
            ctx.moveTo(x, slY)
            ctx.lineTo(rightX, slY)
            ctx.strokeStyle = isSelected ? '#6d28d9' : lineColors.sl
            ctx.lineWidth = isSelected ? 2 : 1
            ctx.setLineDash([4, 4])
            ctx.stroke()

            // TP line: dashed [4,4], colored by status
            ctx.beginPath()
            ctx.moveTo(x, tpY)
            ctx.lineTo(rightX, tpY)
            ctx.strokeStyle = isSelected ? '#6d28d9' : lineColors.tp
            ctx.lineWidth = isSelected ? 2 : 1
            ctx.setLineDash([4, 4])
            ctx.stroke()

            // Vertical dashed connector [3,3] from min(slY,tpY) to max(slY,tpY) at x
            ctx.beginPath()
            ctx.moveTo(x, Math.min(slY, tpY))
            ctx.lineTo(x, Math.max(slY, tpY))
            ctx.strokeStyle = isSelected ? '#6d28d9' : 'rgba(0, 0, 0, 0.45)'
            ctx.lineWidth = 1
            ctx.setLineDash([3, 3])
            ctx.stroke()

            // Vertical end-of-width dashed line
            if (widthEndX < chartCanvas.width) {
                ctx.beginPath()
                ctx.moveTo(widthEndX, Math.min(slY, tpY))
                ctx.lineTo(widthEndX, Math.max(slY, tpY))
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
                ctx.lineWidth = 1
                ctx.setLineDash([3, 3])
                ctx.stroke()
            }

            // Direction arrow (triangle, 6px half-size)
            ctx.setLineDash([])
            ctx.fillStyle = isSelected ? '#6d28d9' : lineColors.entry
            ctx.beginPath()
            if (isLong) {
                // Upward triangle
                ctx.moveTo(x, entryY - 6)
                ctx.lineTo(x - 6, entryY + 6)
                ctx.lineTo(x + 6, entryY + 6)
            } else {
                // Downward triangle
                ctx.moveTo(x, entryY + 6)
                ctx.lineTo(x - 6, entryY - 6)
                ctx.lineTo(x + 6, entryY - 6)
            }
            ctx.closePath()
            ctx.fill()

            // Label: direction + RR + status
            ctx.fillStyle = isSelected ? '#6d28d9' : lineColors.entry
            ctx.font = 'bold 10px sans-serif'
            const rr = getEntryRR(entryTool)
            ctx.fillText(`${entryTool.direction} RR:${rr.toFixed(1)} [${statusToUse}]`, x + 6, entryY - 8)

            ctx.restore()

            // Collect entry data for y-axis tabs
            entryDrawingsRender.push({
                entryY,
                slY,
                tpY,
                entryPrice: entryTool.entryPrice,
                slPrice: entryTool.stopLossPrice,
                tpPrice: entryTool.takeProfitPrice,
                isLong,
                isSelected,
                status: statusToUse,
                widthEndX,
            })

            return
        }

        if (tool.type === 'OB') {
            const yTop = getY(tool.top)
            const yBot = getY(tool.bot)
            const height = Math.abs(yBot - yTop)
            const yDraw = Math.min(yTop, yBot)
            const rectWidth = Math.max(1, (tool.lengthMinutes / timeframeMinutes) * candleSpace)

            ctx.fillStyle = tool.color
            ctx.fillRect(x, yDraw, rectWidth, height)
            ctx.strokeStyle = '#000000'
            ctx.lineWidth = 1
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

        if ('price' in tool) {
            const y = getY(tool.price)
            const lengthMinutes = getDrawingLengthMinutes(tool.lengthMinutes)
            let endX: number
            if (lengthMinutes !== null) {
                const rectWidth = Math.max(1, (lengthMinutes / timeframeMinutes) * candleSpace)
                endX = x + rectWidth
            } else {
                // Determine scan boundaries
                let scanStartIdx = index + 1
                let scanEndIdx = endIdx

                if (tool.breakScanStart) {
                    const bsi = getIndexByTime(data, tool.breakScanStart)
                    if (bsi !== -1) scanStartIdx = bsi + 1
                }
                if (tool.endTime) {
                    const eti = getIndexByTime(data, tool.endTime)
                    if (eti !== -1) scanEndIdx = eti
                }

                // Scan forward for first candle wick crossing this price level
                let crossCandleIdx = -1
                for (let i = scanStartIdx; i <= scanEndIdx; i++) {
                    if (data[i].low <= tool.price && tool.price <= data[i].high) {
                        crossCandleIdx = i
                        break
                    }
                }
                if (crossCandleIdx !== -1) {
                    endX = (crossCandleIdx - runtime.viewStart) * candleSpace + candleSpace / 2
                } else {
                    endX = (scanEndIdx - runtime.viewStart) * candleSpace + candleSpace / 2
                }
            }
            ctx.beginPath()
            ctx.moveTo(x, y)
            ctx.lineTo(endX, y)
            ctx.strokeStyle = isSelected ? '#6d28d9' : tool.color
            ctx.lineWidth = isSelected ? 3 : 1
            ctx.stroke()
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

    const pendingEntry = runtime.pendingEntryPlacement
    if (pendingEntry && !drawMenuOpen) {
        ctx.save()
        ctx.fillStyle = '#0f172a'

        if (!pendingEntry.firstPoint) {
            // Phase 1: pick entry — show dot preview at cursor
            ctx.strokeStyle = 'rgba(15, 23, 42, 0.8)'
            ctx.setLineDash([5, 4])
            ctx.lineWidth = 1.5

            if (runtime.crosshairActive) {
                let hoverDataIndex = Math.round((runtime.crosshairX - candleSpace / 2) / candleSpace + runtime.viewStart)
                // Clamp to last visible candle
                let lastVisibleIndex = candleFilterLastIndex
                hoverDataIndex = Math.min(hoverDataIndex, lastVisibleIndex)
                if (hoverDataIndex >= 0 && hoverDataIndex < data.length) {
                    const cursorPrice = runtime.manualMaxP - (runtime.crosshairY / chartCanvas.height) * priceRange
                    const firstPrice = cursorPrice
                    const firstX = (hoverDataIndex - runtime.viewStart) * candleSpace + candleSpace / 2
                    const firstY = getY(firstPrice)

                    ctx.beginPath()
                    ctx.arc(firstX, firstY, 3.5, 0, Math.PI * 2)
                    ctx.fill()
                }
            }

            ctx.setLineDash([])
            ctx.font = 'bold 11px sans-serif'
            ctx.fillText('Entry: click entry price or press Esc to cancel', 12, pendingFib ? 36 : 18)
            ctx.restore()
        } else if (!pendingEntry.secondPoint) {
            // Phase 2: pick SL — show placed entry + SL preview at cursor
            const entryIndex = getIndexByTime(data, pendingEntry.firstPoint.time)
            if (entryIndex !== -1) {
                const entryX = (entryIndex - runtime.viewStart) * candleSpace + candleSpace / 2
                const entryY = getY(pendingEntry.firstPoint.price)

                // Placed entry dot
                ctx.beginPath()
                ctx.arc(entryX, entryY, 3.5, 0, Math.PI * 2)
                ctx.fillStyle = '#0f172a'
                ctx.fill()

                // Placed entry line (solid)
                ctx.beginPath()
                ctx.moveTo(entryX, entryY)
                ctx.lineTo(chartCanvas.width, entryY)
                ctx.strokeStyle = '#0f172a'
                ctx.lineWidth = 2
                ctx.setLineDash([])
                ctx.stroke()

                if (runtime.crosshairActive) {
                    let hoverDataIndex = Math.round((runtime.crosshairX - candleSpace / 2) / candleSpace + runtime.viewStart)
                    // Clamp to last visible candle
                    let lastVisibleIndex = candleFilterLastIndex
                    hoverDataIndex = Math.min(hoverDataIndex, lastVisibleIndex)
                    if (hoverDataIndex >= 0 && hoverDataIndex < data.length) {
                        const cursorPrice = runtime.manualMaxP - (runtime.crosshairY / chartCanvas.height) * priceRange
                        const slPrice = cursorPrice
                        const slY = getY(slPrice)

                        // SL preview line (dashed red)
                        ctx.beginPath()
                        ctx.moveTo(entryX, slY)
                        ctx.lineTo(chartCanvas.width, slY)
                        ctx.strokeStyle = '#dc2626'
                        ctx.lineWidth = 1.5
                        ctx.setLineDash([6, 4])
                        ctx.stroke()

                        // Vertical connector
                        ctx.beginPath()
                        ctx.moveTo(entryX, entryY)
                        ctx.lineTo(entryX, slY)
                        ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)'
                        ctx.lineWidth = 1
                        ctx.setLineDash([3, 3])
                        ctx.stroke()

                        // SL dot
                        ctx.beginPath()
                        ctx.arc(entryX, slY, 3.5, 0, Math.PI * 2)
                        ctx.fillStyle = '#dc2626'
                        ctx.fill()
                    }
                }
            }

            ctx.setLineDash([])
            ctx.font = 'bold 11px sans-serif'
            ctx.fillStyle = '#0f172a'
            ctx.fillText('Entry: click stop loss price or press Esc to cancel', 12, 18)
            ctx.restore()
        } else if (!pendingEntry.thirdPoint) {
            // Phase 3: pick TP — show placed entry + placed SL + TP preview at cursor
            const inferredDirection: 'LONG' | 'SHORT' = pendingEntry.secondPoint.price < pendingEntry.firstPoint.price ? 'LONG' : 'SHORT'
            const entryColor = inferredDirection === 'LONG' ? '#16a34a' : '#dc2626'
            const entryIndex = getIndexByTime(data, pendingEntry.firstPoint.time)
            if (entryIndex !== -1) {
                const entryX = (entryIndex - runtime.viewStart) * candleSpace + candleSpace / 2
                const entryY = getY(pendingEntry.firstPoint.price)
                const slY = getY(pendingEntry.secondPoint.price)

                // Placed entry dot (colored by direction)
                ctx.beginPath()
                ctx.arc(entryX, entryY, 3.5, 0, Math.PI * 2)
                ctx.fillStyle = entryColor
                ctx.fill()

                // Placed entry line (solid, colored)
                ctx.beginPath()
                ctx.moveTo(entryX, entryY)
                ctx.lineTo(chartCanvas.width, entryY)
                ctx.strokeStyle = entryColor
                ctx.lineWidth = 2
                ctx.setLineDash([])
                ctx.stroke()

                // Placed SL line (dashed red)
                ctx.beginPath()
                ctx.moveTo(entryX, slY)
                ctx.lineTo(chartCanvas.width, slY)
                ctx.strokeStyle = '#dc2626'
                ctx.lineWidth = 1.5
                ctx.setLineDash([6, 4])
                ctx.stroke()

                // SL dot
                ctx.beginPath()
                ctx.arc(entryX, slY, 3.5, 0, Math.PI * 2)
                ctx.fillStyle = '#dc2626'
                ctx.fill()

                // Vertical connector entry→SL
                ctx.beginPath()
                ctx.moveTo(entryX, entryY)
                ctx.lineTo(entryX, slY)
                ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)'
                ctx.lineWidth = 1
                ctx.setLineDash([3, 3])
                ctx.stroke()

                if (runtime.crosshairActive) {
                    let hoverDataIndex = Math.round((runtime.crosshairX - candleSpace / 2) / candleSpace + runtime.viewStart)
                    // Clamp to last visible candle
                    let lastVisibleIndex = candleFilterLastIndex
                    hoverDataIndex = Math.min(hoverDataIndex, lastVisibleIndex)
                    if (hoverDataIndex >= 0 && hoverDataIndex < data.length) {
                        const cursorPrice = runtime.manualMaxP - (runtime.crosshairY / chartCanvas.height) * priceRange
                        const tpPrice = cursorPrice
                        const tpY = getY(tpPrice)

                        // TP preview line (dashed green)
                        ctx.beginPath()
                        ctx.moveTo(entryX, tpY)
                        ctx.lineTo(chartCanvas.width, tpY)
                        ctx.strokeStyle = '#16a34a'
                        ctx.lineWidth = 1.5
                        ctx.setLineDash([6, 4])
                        ctx.stroke()

                        // TP dot
                        ctx.beginPath()
                        ctx.arc(entryX, tpY, 3.5, 0, Math.PI * 2)
                        ctx.fillStyle = '#16a34a'
                        ctx.fill()
                    }
                }
            }

            ctx.setLineDash([])
            ctx.font = 'bold 11px sans-serif'
            ctx.fillStyle = '#0f172a'
            const directionLabel = inferredDirection === 'LONG' ? 'Entry (Long)' : 'Entry (Short)'
            ctx.fillText(`${directionLabel}: click take profit price or press Esc to cancel`, 12, 18)
            ctx.restore()
        } else if (!pendingEntry.fourthPoint) {
            // Phase 4: width picking — show placed entry, SL, TP + cursor width boundary preview
            const inferredDirection: 'LONG' | 'SHORT' = pendingEntry.secondPoint.price < pendingEntry.firstPoint.price ? 'LONG' : 'SHORT'
            const entryColor = inferredDirection === 'LONG' ? '#16a34a' : '#dc2626'
            const entryIndex = getIndexByTime(data, pendingEntry.firstPoint.time)
            if (entryIndex !== -1) {
                const entryX = (entryIndex - runtime.viewStart) * candleSpace + candleSpace / 2
                const entryY = getY(pendingEntry.firstPoint.price)
                const slY = getY(pendingEntry.secondPoint.price)
                const tpY = getY(pendingEntry.thirdPoint.price)

                // Placed entry dot (colored by direction)
                ctx.beginPath()
                ctx.arc(entryX, entryY, 3.5, 0, Math.PI * 2)
                ctx.fillStyle = entryColor
                ctx.fill()

                // Placed entry line (solid, colored)
                ctx.beginPath()
                ctx.moveTo(entryX, entryY)
                ctx.lineTo(chartCanvas.width, entryY)
                ctx.strokeStyle = entryColor
                ctx.lineWidth = 2
                ctx.setLineDash([])
                ctx.stroke()

                // Placed SL line (dashed red)
                ctx.beginPath()
                ctx.moveTo(entryX, slY)
                ctx.lineTo(chartCanvas.width, slY)
                ctx.strokeStyle = '#dc2626'
                ctx.lineWidth = 1.5
                ctx.setLineDash([6, 4])
                ctx.stroke()

                // SL dot
                ctx.beginPath()
                ctx.arc(entryX, slY, 3.5, 0, Math.PI * 2)
                ctx.fillStyle = '#dc2626'
                ctx.fill()

                // Placed TP line (dashed green)
                ctx.beginPath()
                ctx.moveTo(entryX, tpY)
                ctx.lineTo(chartCanvas.width, tpY)
                ctx.strokeStyle = '#16a34a'
                ctx.lineWidth = 1.5
                ctx.setLineDash([6, 4])
                ctx.stroke()

                // TP dot
                ctx.beginPath()
                ctx.arc(entryX, tpY, 3.5, 0, Math.PI * 2)
                ctx.fillStyle = '#16a34a'
                ctx.fill()

                // Vertical connector entry→SL and entry→TP
                ctx.beginPath()
                ctx.moveTo(entryX, Math.min(slY, tpY))
                ctx.lineTo(entryX, Math.max(slY, tpY))
                ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)'
                ctx.lineWidth = 1
                ctx.setLineDash([3, 3])
                ctx.stroke()

                // Vertical dashed line at cursor's candle X for width boundary preview
                if (runtime.crosshairActive) {
                    const hoverDataIndex = Math.round((runtime.crosshairX - candleSpace / 2) / candleSpace + runtime.viewStart)
                    if (hoverDataIndex >= 0 && hoverDataIndex < data.length) {
                        const widthBoundX = (hoverDataIndex - runtime.viewStart) * candleSpace + candleSpace / 2
                        ctx.beginPath()
                        ctx.moveTo(widthBoundX, Math.min(slY, tpY))
                        ctx.lineTo(widthBoundX, Math.max(slY, tpY))
                        ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)'
                        ctx.lineWidth = 1
                        ctx.setLineDash([3, 3])
                        ctx.stroke()
                    }
                }
            }

            ctx.setLineDash([])
            ctx.font = 'bold 11px sans-serif'
            ctx.fillStyle = '#0f172a'
            ctx.fillText('Entry: click candle to set width or press Esc to cancel', 12, 18)
            ctx.restore()
        }
    }

    if (runtime.pendingCandleFilterPick && !drawMenuOpen) {
        ctx.save()
        ctx.setLineDash([])
        ctx.font = 'bold 11px sans-serif'
        ctx.fillStyle = '#0f172a'
        ctx.fillText('Candle Filter: click a candle to set cutoff time', 12, (pendingFib || pendingEntry) ? 36 : 18)
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

    // Draw entry y-axis tabs
    entryDrawingsRender.forEach((entry) => {
        drawEntryAxisTabs(
            yCtx,
            yAxisCanvas,
            entry.entryY,
            entry.slY,
            entry.tpY,
            entry.entryPrice,
            entry.slPrice,
            entry.tpPrice,
            entry.isLong,
            entry.isSelected,
            entry.status,
        )
    })

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