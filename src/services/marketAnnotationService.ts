import type { Dispatch, SetStateAction } from 'react'
import type { Candle, ChartRuntimeState, Drawing, DrawingDraft, Timeframe } from '../types/chart'
import { getDefaultFibLevels } from '../constants/chart'
import { getFirstIndexByDate, getIndexByTime } from '../utils/time'
import { parseCsvText } from '../utils/csv'
import { clamp } from '../utils/math'

export function findTimeByDayAndClock(
    data: Candle[],
    day: string,
    clock: string,
): Candle | null {
    for (let i = 0; i < data.length; i += 1) {
        const t = data[i].time
        if (!t.startsWith(day)) continue
        // Extract HH:MM from time string for exact comparison
        const hhmm = t.includes(' ')
            ? t.split(' ')[1].slice(0, 5)
            : t.includes('T')
                ? t.split('T')[1].slice(0, 5)
                : ''
        if (hhmm === clock) {
            return data[i]
        }
    }
    return null
}

export function getCandlesInTimeRange(
    data: Candle[],
    dateStr: string,
    startHHMM: string,
    endHHMM: string,
): Candle[] {
    const results: Candle[] = []
    for (let i = 0; i < data.length; i += 1) {
        const c = data[i]
        if (!c.time.startsWith(dateStr)) continue
        const hhmm = c.time.includes(' ')
            ? c.time.split(' ')[1].slice(0, 5)
            : c.time.includes('T')
                ? c.time.split('T')[1].slice(0, 5)
                : ''
        if (hhmm >= startHHMM && hhmm < endHHMM) {
            results.push(c)
        }
    }
    return results
}

export function generateMarketAnnotations(
    dateStr: string,
    runtimeRef: { current: ChartRuntimeState },
    setDrawings: Dispatch<SetStateAction<Drawing[]>>,
    setSelectedDrawingId?: Dispatch<SetStateAction<number | null>>,
): void {
    const runtime = runtimeRef.current
    const m1Data = runtime.chartData.m1
    if (!m1Data || m1Data.length === 0) {
        window.alert('Load M1 data first to generate market annotations.')
        return
    }

    const generated: DrawingDraft[] = []
    const boundaries = ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00'] as const

    // 1. VerticalLineDrawing for each boundary time
    for (const clock of boundaries) {
        const candle = findTimeByDayAndClock(m1Data, dateStr, clock)
        if (!candle) continue
        generated.push({ type: 'VLINE', time: candle.time, color: '#7c3aed' })
    }

    // 2. PM_HIGH / PM_LOW pairs for 4 premarket windows
    const pmWindows: Array<{ start: string; end: string }> = [
        { start: '07:00', end: '07:30' },
        { start: '08:00', end: '08:30' },
        { start: '09:00', end: '09:30' },
        { start: '10:00', end: '10:30' },
    ]

    const timeEleven = findTimeByDayAndClock(m1Data, dateStr, '11:00')

    for (const w of pmWindows) {
        const candles = getCandlesInTimeRange(m1Data, dateStr, w.start, w.end)
        if (candles.length === 0) continue
        const high = Math.max(...candles.map((c) => c.high))
        const low = Math.min(...candles.map((c) => c.low))

        const startCandle = findTimeByDayAndClock(m1Data, dateStr, w.start)
        if (!startCandle) continue

        const endBoundary = findTimeByDayAndClock(m1Data, dateStr, w.end)
        if (!endBoundary) continue

        generated.push({
            type: 'PM_HIGH',
            time: startCandle.time,
            price: high,
            lengthMinutes: null,
            endTime: timeEleven ? timeEleven.time : null,
            breakScanStart: endBoundary.time,
            color: 'rgba(59, 130, 246, 0.8)',
        } as DrawingDraft)

        generated.push({
            type: 'PM_LOW',
            time: startCandle.time,
            price: low,
            lengthMinutes: null,
            endTime: timeEleven ? timeEleven.time : null,
            breakScanStart: endBoundary.time,
            color: 'rgba(239, 68, 68, 0.8)',
        } as DrawingDraft)
    }

    // 3. FibDrawing for 4 opening range windows
    const fibWindows: Array<{ start: string; end: string }> = [
        { start: '07:30', end: '08:00' },
        { start: '08:30', end: '09:00' },
        { start: '09:30', end: '10:00' },
        { start: '10:30', end: '11:00' },
    ]

    for (const w of fibWindows) {
        const candles = getCandlesInTimeRange(m1Data, dateStr, w.start, w.end)
        if (candles.length === 0) continue
        const high = Math.max(...candles.map((c) => c.high))
        const low = Math.min(...candles.map((c) => c.low))

        // Detect reverse: if high came before low, reverse=true (downtrend)
        const highIdx = candles.findIndex((c) => c.high === high)
        const lowIdx = candles.findIndex((c) => c.low === low)
        const reverse = highIdx < lowIdx

        const startCandle = findTimeByDayAndClock(m1Data, dateStr, w.start)
        const endCandle = findTimeByDayAndClock(m1Data, dateStr, w.end)
        if (!startCandle || !endCandle) continue

        generated.push({
            type: 'FIB',
            time: startCandle.time,
            time2: endCandle.time,
            price1: low,
            price2: high,
            templateKey: 'fibo_quadrant',
            extendRight: false,
            reverse,
            lineStyle: 'normal',
            lineWidth: 1.5,
            levels: getDefaultFibLevels('fibo_quadrant'),
        })
    }

    // 4. Macro rectangles (20-min windows: 6:50-7:10, 7:50-8:10, ..., 10:50-11:10)
    const macroWindows: Array<{ start: string; end: string }> = [
        { start: '06:50', end: '07:10' },
        { start: '07:50', end: '08:10' },
        { start: '08:50', end: '09:10' },
        { start: '09:50', end: '10:10' },
        { start: '10:50', end: '11:10' },
    ]

    for (const w of macroWindows) {
        const candles = getCandlesInTimeRange(m1Data, dateStr, w.start, w.end)
        if (candles.length === 0) continue
        const high = Math.max(...candles.map((c) => c.high))
        const low = Math.min(...candles.map((c) => c.low))

        const startCandle = findTimeByDayAndClock(m1Data, dateStr, w.start)
        if (!startCandle) continue

        generated.push({
            type: 'FVG',
            time: startCandle.time,
            top: high,
            bot: low,
            lengthMinutes: 20,
            color: 'rgba(59, 130, 246, 0.15)',
            border: 'rgba(59, 130, 246, 0.4)',
        })
    }

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
    setDrawings(nextDrawings)

    const newestId = runtime.drawingIdCounter - 1
    runtime.selectedDrawingId = newestId
    setSelectedDrawingId && setSelectedDrawingId(newestId)
}

export async function prepareDayView(
    dateStr: string,
    runtimeRef: { current: ChartRuntimeState },
    currentTfRef: { current: Timeframe },
    setDrawings: Dispatch<SetStateAction<Drawing[]>>,
    setSelectedDrawingId: Dispatch<SetStateAction<number | null>> | undefined,
    setJumpDate: Dispatch<SetStateAction<string>>,
    drawCanvas: () => void,
    onHideTopBar?: () => void,
): Promise<void> {
    const runtime = runtimeRef.current
    const currentTF = currentTfRef.current
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
    setDrawings([])
    if (setSelectedDrawingId) setSelectedDrawingId(null)

    // 2. Find 6:30 and 11:30 candles for m1
    const m1Data = runtime.chartData.m1
    if (!m1Data || m1Data.length === 0) {
        window.alert('Load M1 data first.')
        return
    }

    const startCandle = findTimeByDayAndClock(m1Data, dateStr, '06:30')
    const endCandle = findTimeByDayAndClock(m1Data, dateStr, '11:30')
    if (!startCandle || !endCandle) {
        window.alert('M1 data must cover 06:30–11:30 for the selected date.')
        return
    }

    const startIdx = getIndexByTime(m1Data, startCandle.time)
    const endIdx = getIndexByTime(m1Data, endCandle.time)
    if (startIdx === -1 || endIdx === -1) {
        window.alert('Could not locate 06:30–11:30 range in M1 data.')
        return
    }

    // 3. Calculate visibleCount to show 6:30-11:30 (300 minutes)
    const visibleCount = endIdx - startIdx + 1
    runtime.visibleCount = clamp(visibleCount, 10, Math.max(data.length, 10))

    // 4. Set viewStart to center on 6:30
    runtime.viewStart = clamp(startIdx - 5, 0, Math.max(data.length - runtime.visibleCount, 0))

    // 5. Calculate high/low of 6:30-11:30 range for Y scale
    let rangeHigh = -Infinity
    let rangeLow = Infinity
    for (let i = startIdx; i <= endIdx; i += 1) {
        if (m1Data[i].high > rangeHigh) rangeHigh = m1Data[i].high
        if (m1Data[i].low < rangeLow) rangeLow = m1Data[i].low
    }

    // 6. Set Y scale with 5% padding
    const priceRange = rangeHigh - rangeLow
    runtime.manualMaxP = rangeHigh + priceRange * 0.05
    runtime.manualMinP = rangeLow - priceRange * 0.05
    runtime.isAutoScaled = false

    // 7. Generate market annotations
    generateMarketAnnotations(dateStr, runtimeRef, setDrawings, setSelectedDrawingId)

    // 8. Hide top bar
    if (onHideTopBar) onHideTopBar()

    setJumpDate(dateStr)
    drawCanvas()
}
