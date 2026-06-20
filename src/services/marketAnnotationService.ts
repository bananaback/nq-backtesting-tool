import type { Dispatch, SetStateAction } from 'react'
import type { Candle, ChartRuntimeState, Drawing, DrawingDraft, Timeframe } from '../types/chart'
import { getDefaultFibLevels } from '../constants/chart'
import { getFirstIndexByDate, getIndexByTime, getPreviousDateString } from '../utils/time'
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
    const boundaries = ['07:00', '08:30', '09:30', '10:00', '10:30', '11:00'] as const

    // 1. VerticalLineDrawing for each boundary time
    for (const clock of boundaries) {
            const candle = findTimeByDayAndClock(m1Data, dateStr, clock)
            if (!candle) continue
            const vlineColor = clock === '08:30' ? '#f97316' : clock === '09:30' ? '#f59e0b' : 'rgba(0, 0, 0, 0.22)'
            generated.push({ type: 'VLINE', time: candle.time, color: vlineColor })
        }

    // 2. PM_HIGH / PM_LOW pairs for 4 premarket windows
    const pmWindows: Array<{ start: string; end: string }> = []

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

    // London High/Low (02:00-05:00)
    const londonCandles = getCandlesInTimeRange(m1Data, dateStr, '02:00', '05:00')
    if (londonCandles.length > 0) {
        const londonHigh = Math.max(...londonCandles.map((c) => c.high))
        const londonLow = Math.min(...londonCandles.map((c) => c.low))

        const londonStart = findTimeByDayAndClock(m1Data, dateStr, '02:00')
        const londonEnd = findTimeByDayAndClock(m1Data, dateStr, '05:00')

        if (londonStart && londonEnd) {
            generated.push({
                type: 'LONDON_HIGH',
                time: londonStart.time,
                price: londonHigh,
                lengthMinutes: 540,
                color: 'rgba(245, 158, 11, 0.9)',
            } as DrawingDraft)

            generated.push({
                type: 'LONDON_LOW',
                time: londonStart.time,
                price: londonLow,
                lengthMinutes: 540,
                color: 'rgba(217, 119, 6, 0.9)',
            } as DrawingDraft)
        }
    }

    // Previous Day PM High/Low (13:30-16:00 of previous day)
    const prevDay = getPreviousDateString(dateStr)
    const prevPmCandles = getCandlesInTimeRange(m1Data, prevDay, '13:30', '16:00')
    if (prevPmCandles.length > 0) {
        const prevPmHigh = Math.max(...prevPmCandles.map((c) => c.high))
        const prevPmLow = Math.min(...prevPmCandles.map((c) => c.low))

        const prevPmStart = findTimeByDayAndClock(m1Data, prevDay, '13:30')
        const prevPmEnd = findTimeByDayAndClock(m1Data, prevDay, '16:00')

        if (prevPmStart && prevPmEnd) {
            generated.push({
                type: 'PREV_DAY_PM_HIGH',
                time: prevPmStart.time,
                price: prevPmHigh,
                lengthMinutes: 1440,
                color: 'rgba(20, 184, 166, 0.9)',
            } as DrawingDraft)

            generated.push({
                type: 'PREV_DAY_PM_LOW',
                time: prevPmStart.time,
                price: prevPmLow,
                lengthMinutes: 1440,
                color: 'rgba(13, 148, 136, 0.9)',
            } as DrawingDraft)
        }
    }

    // Previous Day AM High/Low (09:30-13:30 of previous day)
    const prevDayAm = getPreviousDateString(dateStr)
    const prevAmCandles = getCandlesInTimeRange(m1Data, prevDayAm, '09:30', '13:30')
    if (prevAmCandles.length > 0) {
        const prevAmHigh = Math.max(...prevAmCandles.map((c) => c.high))
        const prevAmLow = Math.min(...prevAmCandles.map((c) => c.low))

        const prevAmStart = findTimeByDayAndClock(m1Data, prevDayAm, '09:30')
        const prevAmEnd = findTimeByDayAndClock(m1Data, prevDayAm, '13:30')

        if (prevAmStart && prevAmEnd) {
            generated.push({
                type: 'PREV_DAY_AM_HIGH',
                time: prevAmStart.time,
                price: prevAmHigh,
                lengthMinutes: 1560,
                color: 'rgba(168, 85, 247, 0.9)',
            } as DrawingDraft)

            generated.push({
                type: 'PREV_DAY_AM_LOW',
                time: prevAmStart.time,
                price: prevAmLow,
                lengthMinutes: 1560,
                color: 'rgba(126, 34, 206, 0.9)',
            } as DrawingDraft)
        }
    }

    // 3. FibDrawing for 4 opening range windows
    const fibWindows: Array<{ start: string; end: string }> = [
        { start: '09:30', end: '10:00' },
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
            extendRight: true,
            reverse,
            lineStyle: 'normal',
            lineWidth: 1.5,
            levels: getDefaultFibLevels('fibo_quadrant').map((l) => l.ratio === 0.5 ? { ...l, color: '#ef4444' } : l),
        })
    }

    // 4. Macro rectangles (20-min windows: 9:50-10:10, 10:50-11:10)
    const macroWindows: Array<{ start: string; end: string }> = [
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

    // Rectangle 6:30-8:00 high/low
    const range630_800_candles = getCandlesInTimeRange(m1Data, dateStr, '06:30', '08:00')
    if (range630_800_candles.length > 0) {
        const range630High = Math.max(...range630_800_candles.map((c) => c.high))
        const range630Low = Math.min(...range630_800_candles.map((c) => c.low))
        const range630Start = findTimeByDayAndClock(m1Data, dateStr, '06:30')
        if (range630Start) {
            generated.push({
                type: 'FVG',
                time: range630Start.time,
                top: range630High,
                bot: range630Low,
                lengthMinutes: 90,
                color: 'rgba(147, 51, 234, 0.10)',
                border: 'rgba(147, 51, 234, 0.45)',
            } as DrawingDraft)
        }
    }

    // 7. Open price horizontal lines (00:00, 08:30, 09:30) extending to 11:00
    const openLineConfigs = [
        { clock: '00:00', type: 'OPEN_0000' as const, lengthMinutes: 660, color: 'rgba(100, 116, 139, 0.9)' },
        { clock: '08:30', type: 'OPEN_0830' as const, lengthMinutes: 150, color: 'rgba(100, 116, 139, 0.9)' },
        { clock: '09:30', type: 'OPEN_0930' as const, lengthMinutes: 90, color: 'rgba(100, 116, 139, 0.9)' },
    ]
    for (const cfg of openLineConfigs) {
        const candle = findTimeByDayAndClock(m1Data, dateStr, cfg.clock)
        if (!candle) continue
        generated.push({
            type: cfg.type,
            time: candle.time,
            price: candle.open,
            lengthMinutes: cfg.lengthMinutes,
            color: cfg.color,
        } as DrawingDraft)
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

    // 3. Calculate visibleCount to cover 6:30-11:30 range in current timeframe
    const startTime = m1Data[startIdx].time
    const endTime = m1Data[endIdx].time
    const tfStartIdx = getIndexByTime(data, startTime)
    const tfEndIdx = getIndexByTime(data, endTime)
    const visibleCount = tfEndIdx >= 0 && tfStartIdx >= 0
        ? tfEndIdx - tfStartIdx + 1
        : endIdx - startIdx + 1
    runtime.visibleCount = clamp(visibleCount, 10, Math.max(data.length, 10))

    // 4. Set viewStart to center on 6:30 in the current timeframe's data
    const viewStartIdx = tfStartIdx >= 0 ? tfStartIdx : 0
    runtime.viewStart = clamp(viewStartIdx - 5, 0, Math.max(data.length - runtime.visibleCount, 0))

    // 5. Calculate high/low of 6:30-11:30 range for Y scale
    let rangeHigh = -Infinity
    let rangeLow = Infinity
    for (let i = startIdx; i <= endIdx; i += 1) {
        if (m1Data[i].high > rangeHigh) rangeHigh = m1Data[i].high
        if (m1Data[i].low < rangeLow) rangeLow = m1Data[i].low
    }

    // Include London session (02:00-05:00) in Y range so London lines are visible
    const londonRangeCandles = getCandlesInTimeRange(m1Data, dateStr, '02:00', '05:00')
    for (const c of londonRangeCandles) {
        if (c.high > rangeHigh) rangeHigh = c.high
        if (c.low < rangeLow) rangeLow = c.low
    }

    // Include Previous Day PM session (13:30-16:00) in Y range
    const prevDayForScale = getPreviousDateString(dateStr)
    const prevPmRangeCandles = getCandlesInTimeRange(m1Data, prevDayForScale, '13:30', '16:00')
    for (const c of prevPmRangeCandles) {
        if (c.high > rangeHigh) rangeHigh = c.high
        if (c.low < rangeLow) rangeLow = c.low
    }

    // Include Previous Day AM session (09:30-13:30) in Y range
    const prevDayAmForScale = getPreviousDateString(dateStr)
    const prevAmRangeCandles = getCandlesInTimeRange(m1Data, prevDayAmForScale, '09:30', '13:30')
    for (const c of prevAmRangeCandles) {
        if (c.high > rangeHigh) rangeHigh = c.high
        if (c.low < rangeLow) rangeLow = c.low
    }

    // Include open prices (00:00, 08:30, 09:30) in Y range
    const openScaleClocks = ['00:00', '08:30', '09:30']
    for (const clock of openScaleClocks) {
        const candle = findTimeByDayAndClock(m1Data, dateStr, clock)
        if (candle) {
            if (candle.open > rangeHigh) rangeHigh = candle.open
            if (candle.open < rangeLow) rangeLow = candle.open
        }
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
