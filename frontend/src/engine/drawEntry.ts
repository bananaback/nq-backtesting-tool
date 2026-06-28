import type { Candle, ChartRuntimeState, EntryDrawing, EntryStatus } from '../types/chart'
import { getEntryRR } from '../utils/drawing'
import { getIndexByTime } from '../utils/time'

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

const STATUS_COLORS: Record<EntryStatus, {
    profitFill: string
    profitStroke: string
    lossFill: string
    lossStroke: string
}> = {
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

export function drawEntryZones(
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
            const rpTop = Math.min(entryY, currentY)
            const rpHeight = Math.abs(entryY - currentY)
            drawRect(rpTop, rpHeight, SPLIT_COLORS.realizedProfitFill, SPLIT_COLORS.realizedProfitStroke)

            const upTop = Math.min(currentY, tpY)
            const upHeight = Math.abs(currentY - tpY)
            drawRect(upTop, upHeight, SPLIT_COLORS.unrealizedProfitFill, SPLIT_COLORS.unrealizedProfitStroke)

            if (lossHeight > 1) {
                drawRect(lossTop, lossHeight, SPLIT_COLORS.atRiskLossFill, SPLIT_COLORS.atRiskLossStroke)
            }
        } else if (inLossZone) {
            if (profitHeight > 1) {
                drawRect(profitTop, profitHeight, SPLIT_COLORS.potentialProfitFill, SPLIT_COLORS.potentialProfitStroke)
            }

            const rlTop = Math.min(entryY, currentY)
            const rlHeight = Math.abs(entryY - currentY)
            drawRect(rlTop, rlHeight, SPLIT_COLORS.realizedLossFill, SPLIT_COLORS.realizedLossStroke)

            const ulTop = Math.min(currentY, slY)
            const ulHeight = Math.abs(currentY - slY)
            drawRect(ulTop, ulHeight, SPLIT_COLORS.unrealizedLossFill, SPLIT_COLORS.unrealizedLossStroke)
        } else {
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

const TAB_COLORS: Record<EntryStatus, { entry: string; sl: string; tp: string }> = {
    IN_PROGRESS: { entry: '#6b7280', sl: '#9ca3af', tp: '#9ca3af' },
    TP_HIT: { entry: '#22c55e', sl: '#ef4444', tp: '#16a34a' },
    SL_HIT: { entry: '#dc2626', sl: '#b91c1c', tp: '#86efac' },
}

export function drawEntryAxisTabs(
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

export function drawPendingEntry(
    ctx: CanvasRenderingContext2D,
    chartCanvas: HTMLCanvasElement,
    runtime: ChartRuntimeState,
    data: Candle[],
    candleSpace: number,
    priceRange: number,
    candleFilterLastIndex: number,
    getY: (price: number) => number,
    pendingFib: boolean,
) {
    const pendingEntry = runtime.pendingEntryPlacement
    if (!pendingEntry) return

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
