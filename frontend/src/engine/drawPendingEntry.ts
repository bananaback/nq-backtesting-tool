import type { Candle } from '../types/chart'
import type { ChartRuntimeState } from '../types/state'
import { getIndexByTime } from '../utils/time'

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
            const hoverDataIndex = Math.min(
                Math.round((runtime.crosshairX - candleSpace / 2) / candleSpace + runtime.viewStart),
                candleFilterLastIndex,
            )
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
                const hoverDataIndex = Math.min(
                    Math.round((runtime.crosshairX - candleSpace / 2) / candleSpace + runtime.viewStart),
                    candleFilterLastIndex,
                )
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
                const hoverDataIndex = Math.min(
                    Math.round((runtime.crosshairX - candleSpace / 2) / candleSpace + runtime.viewStart),
                    candleFilterLastIndex,
                )
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
