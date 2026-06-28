import type { Candle, ChartRuntimeState } from '../types/chart'
import { findCandleByTime, findNewsByDateRange, getIndexByTime, lowerBoundByTime } from '../utils/time'

export function drawNewsMarkers(
    ctx: CanvasRenderingContext2D,
    chartCanvas: HTMLCanvasElement,
    runtime: ChartRuntimeState,
    data: Candle[],
    candleSpace: number,
    startIdx: number,
    endIdx: number,
) {
    const circleY = chartCanvas.height - 14
    const radius = 6

    // Collect unique dates in visible range
    const visibleDates = new Set<string>()
    for (let i = startIdx; i <= endIdx; i++) {
        visibleDates.add(data[i].time.slice(0, 10))
    }

    // Phase 1: group news events by candle index
    type NewsGroup = { events: Array<typeof runtime.newsData[number]>; isHigh: boolean }
    const newsByIndex = new Map<number, NewsGroup>()

    for (const dateStr of visibleDates) {
        const dateNews = findNewsByDateRange(runtime.newsData, dateStr, dateStr)
        for (const evt of dateNews) {
            const isAllDay = evt.time === 'All Day'

            if (isAllDay) {
                const firstIdx = lowerBoundByTime(data, dateStr + 'T00:00')
                if (firstIdx < 0 || firstIdx >= data.length) continue
                if (data[firstIdx].time.slice(0, 10) !== dateStr) continue

                const addToGroup = (idx: number) => {
                    const existing = newsByIndex.get(idx)
                    if (existing) {
                        existing.events.push(evt)
                        existing.isHigh = existing.isHigh || evt.impact === 'High'
                    } else {
                        newsByIndex.set(idx, { events: [evt], isHigh: evt.impact === 'High' })
                    }
                }

                addToGroup(firstIdx)
                // Find last candle
                let lastIdx = firstIdx
                for (let i = firstIdx + 1; i < data.length && data[i].time.slice(0, 10) === dateStr; i++) {
                    lastIdx = i
                }
                if (lastIdx > firstIdx) addToGroup(lastIdx)
            } else {
                const candle = findCandleByTime(data, evt.sort_key)
                if (candle) {
                    const idx = getIndexByTime(data, candle.time)
                    if (idx !== -1) {
                        const existing = newsByIndex.get(idx)
                        if (existing) {
                            existing.events.push(evt)
                            existing.isHigh = existing.isHigh || evt.impact === 'High'
                        } else {
                            newsByIndex.set(idx, { events: [evt], isHigh: evt.impact === 'High' })
                        }
                    }
                } else {
                    const idx = lowerBoundByTime(data, evt.sort_key)
                    if (idx >= 0 && idx < data.length) {
                        const existing = newsByIndex.get(idx)
                        if (existing) {
                            existing.events.push(evt)
                            existing.isHigh = existing.isHigh || evt.impact === 'High'
                        } else {
                            newsByIndex.set(idx, { events: [evt], isHigh: evt.impact === 'High' })
                        }
                    }
                }
            }
        }
    }

    // Phase 2: render grouped markers
    for (const [candleIndex, group] of newsByIndex) {
        const mx = (candleIndex - runtime.viewStart) * candleSpace + candleSpace / 2
        if (mx < 0 || mx > chartCanvas.width) continue

        const color = group.isHigh ? '#ef4444' : '#9ca3af'
        const isHovered = group.events.some(e => runtime.hoveredNews?.sort_key === e.sort_key)

        // Vertical dashed line
        ctx.save()
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.setLineDash([4, 8])
        ctx.beginPath()
        ctx.moveTo(mx, 0)
        ctx.lineTo(mx, chartCanvas.height)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()

        // Circle — white fill, colored border (ring style)
        ctx.save()
        ctx.beginPath()
        ctx.arc(mx, circleY, radius, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        ctx.strokeStyle = color
        ctx.lineWidth = 3
        ctx.setLineDash([])
        ctx.stroke()
        ctx.restore()

        // Hover tooltip — stacked text for multiple events, light style for white canvas
        if (isHovered) {
            ctx.save()
            const lines = group.events.map(e =>
                (e.currency ? e.currency + ' ' : '') + e.event
            )
            const fontSize = 10
            const lineHeight = 14
            ctx.font = `${fontSize}px sans-serif`

            const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width))
            const padX = 7
            const padY = 4
            const totalHeight = lines.length * lineHeight
            const boxW = maxWidth + padX * 2
            const boxH = totalHeight + padY * 2

            let tooltipX = Math.max(4, Math.min(chartCanvas.width - boxW - 4, mx - boxW / 2))
            const tooltipY = circleY - radius - boxH - 6

            // Light background with subtle shadow look
            ctx.fillStyle = 'rgba(255, 255, 250, 0.96)'
            ctx.fillRect(tooltipX, tooltipY, boxW, boxH)
            ctx.strokeStyle = '#cbd5e1'
            ctx.lineWidth = 1
            ctx.strokeRect(tooltipX, tooltipY, boxW, boxH)

            // Text lines — dark with impact-colored label
            for (let li = 0; li < lines.length; li++) {
                const isHighEvt = group.events[li].impact === 'High'
                const lineY = tooltipY + padY + lineHeight * (li + 1) - 3

                // Event name in dark gray
                ctx.fillStyle = '#1e293b'
                ctx.fillText(lines[li], tooltipX + padX, lineY)

                // Impact dot before event if High
                if (isHighEvt) {
                    ctx.fillStyle = '#ef4444'
                    ctx.beginPath()
                    ctx.arc(tooltipX + padX - 8, lineY - 4, 3, 0, Math.PI * 2)
                    ctx.fill()
                }
            }
            ctx.restore()
        }
    }
}
