import type { Candle, Timeframe } from '../types/chart'
import type { ChartRuntimeState } from '../types/state'
import type { Drawing } from '../types/drawings/index'
import { clamp } from '../utils/math'
import { getFirstIndexByDate, getIndexByTime } from '../utils/time'
import { parseCsvText } from '../utils/csv'

type PrepareDayViewDeps = {
    currentTfRef: { current: Timeframe }
    findTimeByDayAndClock: (data: Candle[] | undefined, day: string, clock: string) => Candle | null
    setDrawings: (drawings: Drawing[]) => void
    setSelectedDrawingId?: (id: number | null) => void
    setJumpDate: (date: string) => void
    onHideTopBar?: () => void
    drawCanvas: () => void
}

/**
 * Prepare a full day view: clear drawings, navigate to date, auto-zoom, apply annotations, hide top bar.
 *
 * @param dateStr - Date in "YYYY-MM-DD" format.
 * @param runtime - ChartRuntimeState (mutable).
 * @param deps - Dependencies for navigation and rendering.
 * @param generateAnnotations - Function to generate market annotations for the date.
 */
export async function prepareDayView(
    dateStr: string,
    runtime: ChartRuntimeState,
    deps: PrepareDayViewDeps,
    generateAnnotations: (dateStr: string) => Promise<void>,
): Promise<void> {
    const currentTF = deps.currentTfRef.current
    let data = runtime.chartData[currentTF]

    if (!dateStr) {
        window.alert('Pick a date first.')
        return
    }

    // Reload data if needed
    let index = getFirstIndexByDate(data, dateStr)
    if (index < 0 && runtime.sourceFiles[currentTF]) {
        const refreshedText = await runtime.sourceFiles[currentTF]!.text()
        const refreshedData = parseCsvText(refreshedText)
        runtime.chartData[currentTF] = refreshedData
        data = refreshedData
        index = getFirstIndexByDate(data, dateStr)
    }

    if (!data.length) {
        window.alert('Load chart data before preparing day view.')
        return
    }

    if (index < 0) {
        window.alert(`No data found for ${dateStr} on the current timeframe.`)
        return
    }

    // 1. Clear all drawings
    runtime.drawings = []
    runtime.drawingIdCounter = 1
    runtime.selectedDrawingId = null
    deps.setDrawings([])
    deps.setSelectedDrawingId && deps.setSelectedDrawingId(null)

    // 2. Find first and last m1 candle for the date
    const m1Data = runtime.chartData.m1
    if (!m1Data || m1Data.length === 0) {
        window.alert('Load M1 data first.')
        return
    }

    let startIdx = -1
    let endIdx = -1
    for (let i = 0; i < m1Data.length; i++) {
        if (m1Data[i].time.slice(0, 10) !== dateStr) continue
        if (startIdx === -1) startIdx = i
        endIdx = i
    }
    if (startIdx === -1) {
        window.alert(`No M1 data found for ${dateStr}.`)
        return
    }

    // 3. Compute M1 target candle count in 6:00-10:30 window (baseline for all TFs)
    const m1StartCandle = deps.findTimeByDayAndClock(m1Data, dateStr, '06:00')
    const m1EndCandle = deps.findTimeByDayAndClock(m1Data, dateStr, '10:30')
    const m1TargetCount = (m1StartCandle && m1EndCandle)
        ? getIndexByTime(m1Data, m1EndCandle.time) - getIndexByTime(m1Data, m1StartCandle.time) + 1
        : 271

    // Find 6:00 and 10:30 in current TF data for viewport centering
    const viewStartCandle = deps.findTimeByDayAndClock(data, dateStr, '06:00')
    const viewEndCandle = deps.findTimeByDayAndClock(data, dateStr, '10:30')
    if (viewStartCandle && viewEndCandle) {
        const viewStartIdx = getIndexByTime(data, viewStartCandle.time)
        const viewEndIdx = getIndexByTime(data, viewEndCandle.time)
        if (viewStartIdx !== -1 && viewEndIdx !== -1) {
            const currentCount = viewEndIdx - viewStartIdx + 1
            // Use M1 target count so candle width matches M1 proportions
            runtime.visibleCount = clamp(m1TargetCount, 10, Math.max(data.length, 10))
            // Center the expanded view range on the 6:00-10:30 window
            const extra = runtime.visibleCount - currentCount
            runtime.viewStart = clamp(viewStartIdx - Math.floor(extra / 2), 0, Math.max(data.length - runtime.visibleCount, 0))
        }
    } else {
        // Fallback: current TF lacks exact 06:00/10:30 candles
        runtime.visibleCount = clamp(m1TargetCount, 10, Math.max(data.length, 10))
        runtime.viewStart = clamp(index - Math.floor(runtime.visibleCount / 4), 0, Math.max(data.length - runtime.visibleCount, 0))
    }

    // 5. Auto-scale Y axis from visible candle range
    // Renderer computes manualMaxP/manualMinP with 5% padding when isAutoScaled=true
    runtime.isAutoScaled = true

    // 6. Generate market annotations
    await generateAnnotations(dateStr)

    // 7. Hide top bar
    if (deps.onHideTopBar) deps.onHideTopBar()

    deps.setJumpDate(dateStr)
    deps.drawCanvas()
}
