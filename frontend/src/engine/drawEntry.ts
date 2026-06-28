import type { Candle } from '../types/chart'
import type { ChartRuntimeState } from '../types/state'
import type { EntryDrawing, EntryStatus } from '../types/drawings/entry'
import { getEntryRR } from '../utils/drawing'
import { drawEntryZones } from './drawEntryZones'

export function renderEntry(
    ctx: CanvasRenderingContext2D,
    chartCanvas: HTMLCanvasElement,
    runtime: ChartRuntimeState,
    data: Candle[],
    candleSpace: number,
    timeframeMinutes: number,
    getY: (price: number) => number,
    tool: EntryDrawing,
    x: number,
    index: number,
    isSelected: boolean,
    shouldRenderCandle: (time: string) => boolean,
): { entryY: number; slY: number; tpY: number; entryPrice: number; slPrice: number; tpPrice: number; isLong: boolean; isSelected: boolean; status: EntryStatus; widthEndX: number } | null {
    const entryTool = tool
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

    return {
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
    }
}
