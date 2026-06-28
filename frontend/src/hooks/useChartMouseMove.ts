import type { RefObject } from 'react'
import type { NewsEvent, Timeframe } from '../types/chart'
import type { ChartRuntimeState } from '../types/state'
import { findNewsByDateRange, lowerBoundByTime, findCandleByTime, getIndexByTime } from '../utils/time'

/** Handle mousemove for crosshair tracking, news hover, chart/axis drag. */
export function handleChartMouseMove(
    event: globalThis.MouseEvent,
    chartCanvasRef: RefObject<HTMLCanvasElement | null>,
    runtimeRef: RefObject<ChartRuntimeState>,
    currentTfRef: RefObject<Timeframe>,
    drawCanvas: () => void,
): void {
    const chartCanvas = chartCanvasRef.current
    if (!chartCanvas) return

    const runtime = runtimeRef.current
    const chartRect = chartCanvas.getBoundingClientRect()
    runtime.crosshairActive =
        event.clientX >= chartRect.left &&
        event.clientX <= chartRect.right &&
        event.clientY >= chartRect.top &&
        event.clientY <= chartRect.bottom
    if (runtime.crosshairActive) {
        runtime.crosshairX = event.clientX - chartRect.left
        runtime.crosshairY = event.clientY - chartRect.top
    }

    // News hover detection — check if mouse is near any native news circle
    let foundNews: NewsEvent | null = null
    const chartHeight = chartCanvas.height
    const circleY = chartHeight - 12
    const hoverRadius = 8

    if (runtime.crosshairActive && runtime.showNews && runtime.newsData.length > 0) {
        const data = runtime.chartData[currentTfRef.current]
        if (data.length > 0) {
            const candleSpace = chartCanvas.width / Math.max(1, runtime.visibleCount)
            const startIdx = Math.floor(Math.max(0, runtime.viewStart))
            const endIdx = Math.ceil(Math.min(data.length - 1, runtime.viewStart + runtime.visibleCount))

            // Collect unique dates in visible range
            const visibleDates = new Set<string>()
            for (let i = startIdx; i <= endIdx && i < data.length; i++) {
                visibleDates.add(data[i].time.slice(0, 10))
            }

            for (const dateStr of visibleDates) {
                const dateNews = findNewsByDateRange(runtime.newsData, dateStr, dateStr)
                for (const evt of dateNews) {
                    const isAllDay = evt.time === 'All Day'
                    const checkPos = (candleIndex: number) => {
                        if (candleIndex < 0 || candleIndex >= data.length) return
                        const x = (candleIndex - runtime.viewStart) * candleSpace + candleSpace / 2
                        const dx = runtime.crosshairX - x
                        const dy = runtime.crosshairY - circleY
                        const dist = Math.sqrt(dx * dx + dy * dy)
                        if (dist < hoverRadius) {
                            foundNews = evt
                        }
                    }

                    if (isAllDay) {
                        // Binary search for first candle of date, then scan for last
                        const firstIdx = lowerBoundByTime(data, dateStr + 'T00:00')
                        if (firstIdx < 0 || firstIdx >= data.length) continue
                        if (data[firstIdx].time.slice(0, 10) !== dateStr) continue

                        let lastIdx = firstIdx
                        for (let i = firstIdx + 1; i < data.length && data[i].time.slice(0, 10) === dateStr; i++) {
                            lastIdx = i
                        }

                        checkPos(firstIdx)
                        if (!foundNews && lastIdx > firstIdx) checkPos(lastIdx)
                    } else {
                        // Timed: try exact match first, fallback to nearest candle
                        const candle = findCandleByTime(data, evt.sort_key)
                        if (candle) {
                            const idx = getIndexByTime(data, candle.time)
                            if (idx !== -1) checkPos(idx)
                        } else {
                            const idx = lowerBoundByTime(data, evt.sort_key)
                            if (idx >= 0 && idx < data.length) checkPos(idx)
                        }
                    }

                    if (foundNews) break
                }
                if (foundNews) break
            }
        }
    }

    runtime.hoveredNews = foundNews

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
