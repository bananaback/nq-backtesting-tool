import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { Candle, Timeframe } from '../types/chart'
import type { ChartRuntimeState } from '../types/state'
import type { DrawingDraft } from '../types/drawings/index'
import { clamp } from '../utils/math'
import { getFirstIndexByDate, getIndexByTime, getPreviousDateString, getPreviousTradingDay, lowerBoundByTime } from '../utils/time'
import { getDefaultFibLevels } from '../constants/chart'
import { parseCsvText } from '../utils/csv'

type MarketAnnotationsDeps = {
    runtimeRef: RefObject<ChartRuntimeState>
    currentTfRef: RefObject<Timeframe>
    setDrawings: Dispatch<SetStateAction<any>>
    setSelectedDrawingId?: Dispatch<SetStateAction<number | null>>
    setJumpDate: Dispatch<SetStateAction<string>>
    setMktAnnotDialogOpen?: Dispatch<SetStateAction<boolean>>
    onHideTopBar?: () => void
    drawCanvas: () => void
    findTimeByDayAndClock: (data: Candle[] | undefined, day: string, clock: string) => Candle | null
    findPreviousClockClose: (data: Candle[] | undefined, beforeIndex: number, clock: string) => Candle | null
    findPriorClockAcrossDays: (data: Candle[] | undefined, startDay: string, clock: string) => { day: string; candle: Candle } | null
    findSessionOpenOnPreviousDay: (data: Candle[] | undefined, selectedDay: string) => Candle | null
    buildSessionGapDrawing: (type: 'ORG' | 'NDOG' | 'NWOG', gapTime: string, prevClose: number, sessionOpen: number) => DrawingDraft
    listAvailableDaysUntil: (data: Candle[] | undefined, endDay: string) => string[]
}

export function createMarketAnnotations({
    runtimeRef,
    currentTfRef,
    setDrawings,
    setSelectedDrawingId,
    setJumpDate,
    setMktAnnotDialogOpen,
    onHideTopBar,
    drawCanvas,
    findTimeByDayAndClock,
    findPreviousClockClose,
    findPriorClockAcrossDays,
    findSessionOpenOnPreviousDay,
    buildSessionGapDrawing,
    listAvailableDaysUntil,
}: MarketAnnotationsDeps) {
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
    const getCandlesInTimeRange = (
        data: typeof runtimeRef.current.chartData.m1,
        dateStr: string,
        startHHMM: string,
        endHHMM: string,
    ): Candle[] => {
        const startIdx = lowerBoundByTime(data, dateStr + 'T' + startHHMM)
        const endIdx = lowerBoundByTime(data, dateStr + 'T' + endHHMM)
        const slice = data.slice(startIdx, endIdx)
        // Filter to ensure only this date's candles (handles date boundary edge cases)
        return slice.filter((c) => c.time.slice(0, 10) === dateStr)
    }

    /**
     * Generate all market annotation drawings for a given date using m1 data.
     *
     * Creates up to 21 drawings: 9 VLINE at :00/:30 boundaries, 8 PM_HIGH/PM_LOW
     * lines for premarket windows, and 4 FIB drawings for opening range windows.
     * Appends drawings to runtime state and selects the newest one.
     *
     * @param dateStr - Date in "YYYY-MM-DD" format.
     * @returns void. Side effects only.
     *
     * Side effects:
     *   On success: mutates runtime.drawings, runtime.drawingIdCounter,
     *               runtime.selectedDrawingId; calls setDrawings and setSelectedDrawingId.
     *   On failure: calls window.alert with an error message.
     */
    const generateMarketAnnotations = async (dateStr: string): Promise<void> => {
        const runtime = runtimeRef.current

        const m1Data = runtime.chartData.m1
        if (!m1Data || m1Data.length === 0) {
            window.alert('Load M1 data first to generate market annotations.')
            return
        }

        const generated: DrawingDraft[] = []
        const boundaries = ['07:00', '08:30', '09:30', '10:00', '10:30', '11:00'] as const

        // Helper: compute minutes from a start time string to dateStr 11:00
        const targetEndMs = new Date(`${dateStr}T11:00`).getTime()
        const lengthTo1100 = (startTime: string) => {
            const normalized = startTime.includes(' ') ? startTime.replace(' ', 'T') : startTime
            return Math.round((targetEndMs - new Date(normalized).getTime()) / 60000)
        }

        // 11:00 candle on the annotation date — used as endTime for cross-day lines
        const candle1100 = findTimeByDayAndClock(m1Data, dateStr, '11:00')

        // 1. VerticalLineDrawing for each boundary time
        for (const clock of boundaries) {
            const candle = findTimeByDayAndClock(m1Data, dateStr, clock)
            if (!candle) continue
            const vlineColor = clock === '08:30' ? '#f97316' : clock === '09:30' ? '#f59e0b' : 'rgba(0, 0, 0, 0.22)'
            generated.push({ type: 'VLINE', time: candle.time, color: vlineColor })
        }

        // 2. PM_HIGH / PM_LOW pairs for 5 premarket windows (currently unused)

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
                    lengthMinutes: lengthTo1100(londonStart.time),
                    color: 'rgba(245, 158, 11, 0.9)',
                } as DrawingDraft)

                generated.push({
                    type: 'LONDON_LOW',
                    time: londonStart.time,
                    price: londonLow,
                    lengthMinutes: lengthTo1100(londonStart.time),
                    color: 'rgba(217, 119, 6, 0.9)',
                } as DrawingDraft)
            }
        }

        // Asian High/Low (20:00-00:00 of previous calendar day — Sunday for Monday)
        const asianPrevDay = getPreviousDateString(dateStr)
        const asianPrevCandles = getCandlesInTimeRange(m1Data, asianPrevDay, '20:00', '24:00')
        const asianCurrCandles = getCandlesInTimeRange(m1Data, dateStr, '00:00', '00:01')
        const asianCandles = [...asianPrevCandles, ...asianCurrCandles]
        if (asianCandles.length > 0) {
            const asianHigh = Math.max(...asianCandles.map((c) => c.high))
            const asianLow = Math.min(...asianCandles.map((c) => c.low))

            const asianStart = findTimeByDayAndClock(m1Data, asianPrevDay, '20:00')
            if (asianStart) {
                generated.push({
                    type: 'ASIAN_HIGH',
                    time: asianStart.time,
                    price: asianHigh,
                    lengthMinutes: lengthTo1100(asianStart.time),
                    color: 'rgba(37, 99, 235, 0.9)',
                } as DrawingDraft)

                generated.push({
                    type: 'ASIAN_LOW',
                    time: asianStart.time,
                    price: asianLow,
                    lengthMinutes: lengthTo1100(asianStart.time),
                    color: 'rgba(29, 78, 216, 0.9)',
                } as DrawingDraft)
            }
        }

        // Previous Day PM High/Low (13:30-16:00 of previous day)
        const prevDay = getPreviousTradingDay(dateStr)
        const prevPmCandles = getCandlesInTimeRange(m1Data, prevDay, '13:30', '16:00')
        if (prevPmCandles.length > 0) {
            const prevPmHigh = Math.max(...prevPmCandles.map((c) => c.high))
            const prevPmLow = Math.min(...prevPmCandles.map((c) => c.low))

            const prevPmStart = findTimeByDayAndClock(m1Data, prevDay, '13:30')

            // 75% threshold: 150 expected minutes, need >= 113 candles
            const pmExpected = 150
            if (prevPmCandles.length >= Math.ceil(pmExpected * 0.75)) {
                const startTime = prevPmStart?.time ?? prevPmCandles[0].time
                const endTime = candle1100?.time
                generated.push({
                    type: 'PREV_DAY_PM_HIGH',
                    time: startTime,
                    price: prevPmHigh,
                    lengthMinutes: null,
                    endTime,
                    breakScanStart: endTime,
                    color: 'rgba(20, 184, 166, 0.9)',
                } as DrawingDraft)

                generated.push({
                    type: 'PREV_DAY_PM_LOW',
                    time: startTime,
                    price: prevPmLow,
                    lengthMinutes: null,
                    endTime,
                    breakScanStart: endTime,
                    color: 'rgba(13, 148, 136, 0.9)',
                } as DrawingDraft)
            }
        }

        // Previous Day AM High/Low (09:30-13:30 of previous day)
        const prevDayAm = getPreviousTradingDay(dateStr)
        const prevAmCandles = getCandlesInTimeRange(m1Data, prevDayAm, '09:30', '13:30')
        if (prevAmCandles.length > 0) {
            const prevAmHigh = Math.max(...prevAmCandles.map((c) => c.high))
            const prevAmLow = Math.min(...prevAmCandles.map((c) => c.low))

            const prevAmStart = findTimeByDayAndClock(m1Data, prevDayAm, '09:30')

            // 75% threshold: 240 expected minutes, need >= 180 candles
            const amExpected = 240
            if (prevAmCandles.length >= Math.ceil(amExpected * 0.75)) {
                const startTime = prevAmStart?.time ?? prevAmCandles[0].time
                const endTime = candle1100?.time
                generated.push({
                    type: 'PREV_DAY_AM_HIGH',
                    time: startTime,
                    price: prevAmHigh,
                    lengthMinutes: null,
                    endTime,
                    breakScanStart: endTime,
                    color: 'rgba(168, 85, 247, 0.9)',
                } as DrawingDraft)

                generated.push({
                    type: 'PREV_DAY_AM_LOW',
                    time: startTime,
                    price: prevAmLow,
                    lengthMinutes: null,
                    endTime,
                    breakScanStart: endTime,
                    color: 'rgba(126, 34, 206, 0.9)',
                } as DrawingDraft)
            }
        }

        // 3. FibDrawing for 5 opening range windows
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

        // 5. Rectangle 6:30-8:00 high/low
        const range630_800_candles = getCandlesInTimeRange(m1Data, dateStr, '06:30', '08:00')
        const range630Start = range630_800_candles.length > 0 ? findTimeByDayAndClock(m1Data, dateStr, '06:30') : null
        if (range630_800_candles.length > 0) {
            const range630High = Math.max(...range630_800_candles.map((c) => c.high))
            const range630Low = Math.min(...range630_800_candles.map((c) => c.low))
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

        // 5b. Premarket 6:30-8:00 High/Low lines (with text labels)
        if (range630_800_candles.length > 0 && range630Start) {
            const preHigh = Math.max(...range630_800_candles.map((c) => c.high))
            const preLow = Math.min(...range630_800_candles.map((c) => c.low))
            generated.push({
                type: 'PRE_HIGH',
                time: range630Start.time,
                price: preHigh,
                lengthMinutes: lengthTo1100(range630Start.time),
                color: 'rgba(236, 72, 153, 0.9)',
            } as DrawingDraft)

            generated.push({
                type: 'PRE_LOW',
                time: range630Start.time,
                price: preLow,
                lengthMinutes: lengthTo1100(range630Start.time),
                color: 'rgba(190, 24, 93, 0.9)',
            } as DrawingDraft)
        }

        // 6. NWOG — gap between most recent Sunday 18:00 open and prior Friday 16:14 close
        // Find the most recent Sunday (going back from selected date)
        const findMostRecentSunday = (d: string) => {
            let date = new Date(`${d}T12:00:00`)
            while (date.getDay() !== 0) {
                date.setDate(date.getDate() - 1)
            }
            return date.toISOString().slice(0, 10)
        }
        const recentSunday = findMostRecentSunday(dateStr)
        const nwogOpenCandle = findTimeByDayAndClock(m1Data, recentSunday, '18:00')
        if (nwogOpenCandle) {
            const nwogClosePrior = findPriorClockAcrossDays(m1Data, recentSunday, '16:14')
            if (nwogClosePrior) {
                generated.push(buildSessionGapDrawing('NWOG', nwogOpenCandle.time, nwogClosePrior.candle.close, nwogOpenCandle.open))
            }
        }

        // 6. NDOG — gap between previous day 18:00 open and prior 16:14 close (Mon skip)
        const dow = new Date(`${dateStr}T12:00:00`).getDay()
        if (dow !== 1) {
            const ndogOpenCandle = findSessionOpenOnPreviousDay(m1Data, dateStr)
            if (ndogOpenCandle) {
                const openDay = getPreviousDateString(dateStr)
                const ndogClosePrior = findPriorClockAcrossDays(m1Data, openDay, '16:14')
                if (ndogClosePrior) {
                    generated.push(buildSessionGapDrawing('NDOG', ndogOpenCandle.time, ndogClosePrior.candle.close, ndogOpenCandle.open))
                }
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

        // 8. ORG (Opening Range Gap) — 09:30 open vs prior 16:14 close
        const orgOpenCandle = findTimeByDayAndClock(m1Data, dateStr, '09:30')
        if (orgOpenCandle) {
            const orgOpenIdx = m1Data.indexOf(orgOpenCandle)
            const prev1614 = findPreviousClockClose(m1Data, orgOpenIdx, '16:14')
            if (prev1614) {
                generated.push(buildSessionGapDrawing('ORG', orgOpenCandle.time, prev1614.close, orgOpenCandle.open))
            }
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

        // Do not auto-select after drawing creation
    }

    /**
     * Prepare a full day view: clear drawings, navigate to date, auto-zoom, apply annotations, hide top bar.
     *
     * @param dateStr - Date in "YYYY-MM-DD" format.
     */
    const prepareDayView = async (dateStr: string): Promise<void> => {
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
        setSelectedDrawingId && setSelectedDrawingId(null)

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

        // 3. Find 6:00 and 10:30 in current TF data for viewport positioning
        const viewStartCandle = findTimeByDayAndClock(data, dateStr, '06:00')
        const viewEndCandle = findTimeByDayAndClock(data, dateStr, '10:30')
        if (viewStartCandle && viewEndCandle) {
            const viewStartIdx = getIndexByTime(data, viewStartCandle.time)
            const viewEndIdx = getIndexByTime(data, viewEndCandle.time)
            if (viewStartIdx !== -1 && viewEndIdx !== -1) {
                // Calculate visibleCount to show 6:00-10:30 in current TF
                const visibleCount = viewEndIdx - viewStartIdx + 1
                runtime.visibleCount = clamp(visibleCount, 10, Math.max(data.length, 10))
                // Set viewStart exactly at 6:00
                runtime.viewStart = clamp(viewStartIdx, 0, Math.max(data.length - runtime.visibleCount, 0))
            }
        } else {
            // Fallback: current TF lacks exact 06:00/10:30 candles
            // Position view at the date's first candle with a reasonable visible window
            runtime.visibleCount = clamp(60, 10, Math.max(data.length, 10))
            runtime.viewStart = clamp(index - Math.floor(runtime.visibleCount / 4), 0, Math.max(data.length - runtime.visibleCount, 0))
        }

        // 5. Auto-scale Y axis from visible candle range
        // Renderer computes manualMaxP/manualMinP with 5% padding when isAutoScaled=true
        runtime.isAutoScaled = true

        // 6. Generate market annotations
        await generateMarketAnnotations(dateStr)

        // 7. Hide top bar
        if (onHideTopBar) onHideTopBar()

        setJumpDate(dateStr)
        drawCanvas()
    }

    return { generateMarketAnnotations, prepareDayView }
}
