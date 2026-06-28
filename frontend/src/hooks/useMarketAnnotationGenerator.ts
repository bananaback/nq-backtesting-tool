import type { Candle } from '../types/chart'
import type { ChartRuntimeState } from '../types/state'
import type { DrawingDraft } from '../types/drawings/index'
import type { Drawing } from '../types/drawings/index'
import { lowerBoundByTime } from '../utils/time'
import { generateSessionAnnotations } from './marketAnnotationSessions'
import { generateGapAnnotations } from './marketAnnotationGaps'

type GeneratorDeps = {
    findTimeByDayAndClock: (data: Candle[] | undefined, day: string, clock: string) => Candle | null
    findPreviousClockClose: (data: Candle[] | undefined, beforeIndex: number, clock: string) => Candle | null
    findPriorClockAcrossDays: (data: Candle[] | undefined, startDay: string, clock: string) => { day: string; candle: Candle } | null
    findSessionOpenOnPreviousDay: (data: Candle[] | undefined, selectedDay: string) => Candle | null
    buildSessionGapDrawing: (type: 'ORG' | 'NDOG' | 'NWOG', gapTime: string, prevClose: number, sessionOpen: number) => DrawingDraft
    setDrawings: (drawings: Drawing[]) => void
}

/**
 * Filter m1 candles to those on a given date within a time range.
 *
 * Time strings may use space ("YYYY-MM-DD HH:MM") or T ("YYYY-MM-DDTHH:MM")
 * separator formats. Compares HH:MM lexicographically.
 *
 * @param data - m1 candle array from runtime.chartData.m1.
 * @param dateStr - Date in "YYYY-MM-DD" format to filter by.
 * @param startHHMM - Inclusive start time in "HH:MM" 24h format.
 * @param endHHMM - Exclusive end time in "HH:MM" 24h format.
 * @returns Candles where time >= startHHMM and time < endHHMM on the given date.
 */
function getCandlesInTimeRange(
    data: Candle[],
    dateStr: string,
    startHHMM: string,
    endHHMM: string,
): Candle[] {
    const startIdx = lowerBoundByTime(data, dateStr + 'T' + startHHMM)
    const endIdx = lowerBoundByTime(data, dateStr + 'T' + endHHMM)
    const slice = data.slice(startIdx, endIdx)
    // Filter to ensure only this date's candles (handles date boundary edge cases)
    return slice.filter((c) => c.time.slice(0, 10) === dateStr)
}

function findMostRecentSunday(d: string): string {
    let date = new Date(`${d}T12:00:00`)
    while (date.getDay() !== 0) {
        date.setDate(date.getDate() - 1)
    }
    return date.toISOString().slice(0, 10)
}

/**
 * Generate all market annotation drawings for a given date using m1 data.
 *
 * Creates VLINE, session high/low, FIB, FVG, gap, and open price drawings.
 * Appends drawings to runtime state.
 *
 * @param dateStr - Date in "YYYY-MM-DD" format.
 * @param runtime - ChartRuntimeState (mutable, will be updated with new drawings).
 * @param deps - Dependencies for finding candles and building drawings.
 * @returns void. Side effects only.
 *
 * Side effects:
 *   On success: mutates runtime.drawings, runtime.drawingIdCounter; calls deps.setDrawings.
 *   On failure: calls window.alert with an error message.
 */
export async function generateMarketAnnotations(
    dateStr: string,
    runtime: ChartRuntimeState,
    deps: GeneratorDeps,
): Promise<void> {
    const m1Data = runtime.chartData.m1
    if (!m1Data || m1Data.length === 0) {
        window.alert('Load M1 data first to generate market annotations.')
        return
    }

    const generated: DrawingDraft[] = []
    const boundaries = ['07:00', '08:30', '09:30', '10:00', '10:30', '11:00'] as const

    // 1. VerticalLineDrawing for each boundary time
    for (const clock of boundaries) {
        const candle = deps.findTimeByDayAndClock(m1Data, dateStr, clock)
        if (!candle) continue
        const vlineColor = clock === '08:30' ? '#f97316' : clock === '09:30' ? '#f59e0b' : 'rgba(0, 0, 0, 0.22)'
        generated.push({ type: 'VLINE', time: candle.time, color: vlineColor })
    }

    // 2. Session annotations (London, Asian, Prev Day PM/AM)
    const sessionResult = generateSessionAnnotations(
        m1Data, dateStr, 0, getCandlesInTimeRange, deps.findTimeByDayAndClock,
    )
    generated.push(...sessionResult.drawings)

    // 3. Gap/FVG/ORG/NDOG/NWOG/PRE/OPEN annotations
    const gapResult = generateGapAnnotations(
        m1Data, dateStr, 0,
        getCandlesInTimeRange,
        deps.findTimeByDayAndClock,
        deps.findPreviousClockClose,
        deps.findPriorClockAcrossDays,
        deps.findSessionOpenOnPreviousDay,
        deps.buildSessionGapDrawing,
        findMostRecentSunday,
    )
    generated.push(...gapResult.drawings)

    if (generated.length === 0) {
        window.alert('No annotations could be generated. Ensure M1 data covers 07:00–11:00 for the selected date.')
        return
    }

    const nextDrawings = [
        ...runtime.drawings,
        ...generated.map((item, offset) => ({ ...item, id: runtime.drawingIdCounter + offset })) as Drawing[],
    ]
    runtime.drawingIdCounter += generated.length
    runtime.drawings = nextDrawings
    deps.setDrawings(nextDrawings)

    // Do not auto-select after drawing creation
}
