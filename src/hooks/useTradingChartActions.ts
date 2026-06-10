import type { Dispatch, RefObject, SetStateAction, MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from 'react'
import type { Candle, ChartRuntimeState, Drawing, DrawingDraft, DrawMenuState, Timeframe, ToolType } from '../chartTypes'
import { clamp, getDefaultFibLevels, getFirstIndexByDate, getIndexByTime, getPreviousDateString, parseCsvText, roundTimeToTimeframe } from '../chartUtils'
import { createLoadCsvFiles } from './loadTradingChartCsvFiles'

type TradingChartActionsDeps = {
    chartCanvasRef: RefObject<HTMLCanvasElement | null>
    yAxisCanvasRef: RefObject<HTMLCanvasElement | null>
    xAxisCanvasRef: RefObject<HTMLCanvasElement | null>
    runtimeRef: RefObject<ChartRuntimeState>
    currentTfRef: RefObject<Timeframe>
    drawModeRef: RefObject<boolean>
    showDaySeparatorsRef: RefObject<boolean>
    drawMenuOpenRef: RefObject<boolean>
    setCurrentTF: Dispatch<SetStateAction<Timeframe>>
    setJumpDate: Dispatch<SetStateAction<string>>
    setDrawMode: Dispatch<SetStateAction<boolean>>
    setShowDaySeparators: Dispatch<SetStateAction<boolean>>
    setDrawMenu: Dispatch<SetStateAction<DrawMenuState>>
    setDrawings: Dispatch<SetStateAction<Drawing[]>>
    setSelectedDrawingId?: Dispatch<SetStateAction<number | null>>
    setFibPlacementStep: Dispatch<SetStateAction<'pick-first' | 'pick-second' | null>>
    setEntryPlacementStep: Dispatch<SetStateAction<'pick-entry' | 'pick-sl' | 'pick-tp' | 'pick-width' | null>>
    setCandleFilterMinute?: Dispatch<SetStateAction<string>>
    setRenderAfterFilterMinute?: Dispatch<SetStateAction<boolean>>
    setMktAnnotDialogOpen: Dispatch<SetStateAction<boolean>>
    onHideTopBar?: () => void
    drawCanvas: () => void
}

export function createTradingChartActions({
    chartCanvasRef,
    yAxisCanvasRef,
    xAxisCanvasRef,
    runtimeRef,
    currentTfRef,
    drawModeRef,
    showDaySeparatorsRef,
    drawMenuOpenRef,
    setCurrentTF,
    setJumpDate,
    setDrawMode,
    setShowDaySeparators,
    setDrawMenu,
    setDrawings,
    setSelectedDrawingId,
    setFibPlacementStep,
    setEntryPlacementStep,
    setCandleFilterMinute,
    setRenderAfterFilterMinute,
    setMktAnnotDialogOpen,
    onHideTopBar,
    drawCanvas,
}: TradingChartActionsDeps) {
    const handleChartMouseDown = (event: ReactMouseEvent<HTMLCanvasElement>) => {
        const runtime = runtimeRef.current
        runtime.mouseDownX = event.clientX
        runtime.mouseDownY = event.clientY

        if (!drawMenuOpenRef.current && !runtime.pendingFibPlacement && !runtime.pendingEntryPlacement) {
            runtime.isDraggingChart = true
            runtime.lastX = event.clientX
            runtime.lastY = event.clientY
            if (chartCanvasRef.current) chartCanvasRef.current.style.cursor = 'grabbing'
            drawCanvas()
        }
    }

    const handleChartWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
        event.preventDefault()
        if (drawMenuOpenRef.current) return

        const chartCanvas = chartCanvasRef.current
        if (!chartCanvas) return

        const runtime = runtimeRef.current
        const data = runtime.chartData[currentTfRef.current]
        if (!data.length) return

        const zoomFactor = event.nativeEvent.deltaY > 0 ? 1.1 : 0.9
        const ratio = event.nativeEvent.offsetX / chartCanvas.width
        const indexAtMouse = runtime.viewStart + runtime.visibleCount * ratio

        runtime.visibleCount *= zoomFactor
        runtime.visibleCount = clamp(runtime.visibleCount, 10, Math.max(data.length * 2, 10))
        runtime.viewStart = indexAtMouse - runtime.visibleCount * ratio
        drawCanvas()
    }

    const handleChartMouseLeave = () => {
        runtimeRef.current.crosshairActive = false
        if (!runtimeRef.current.isDraggingChart) drawCanvas()
    }

    const handleYAxisMouseDown = (event: ReactMouseEvent<HTMLCanvasElement>) => {
        runtimeRef.current.isDraggingAxis = true
        runtimeRef.current.lastY = event.clientY
    }

    const handleYAxisDoubleClick = () => {
        runtimeRef.current.isAutoScaled = true
        drawCanvas()
    }

    const changeTimeframe = (nextTF: Timeframe) => {
        const runtime = runtimeRef.current
        const oldTF = currentTfRef.current
        if (nextTF === oldTF) return

        const oldData = runtime.chartData[oldTF]
        const newData = runtime.chartData[nextTF]
        if (oldData.length && newData.length) {
            const centerIndex = Math.floor(runtime.viewStart + runtime.visibleCount / 2)
            const clampedIndex = clamp(centerIndex, 0, oldData.length - 1)
            const centerTime = oldData[clampedIndex].time
            const newCenterIndex = Math.max(0, getIndexByTime(newData, centerTime))
            runtime.viewStart = newCenterIndex - runtime.visibleCount / 2
        }

        runtime.isAutoScaled = true
        currentTfRef.current = nextTF
        setCurrentTF(nextTF)
    }

    const jumpToDate = async (dateStr: string) => {
        const runtime = runtimeRef.current
        const currentTF = currentTfRef.current
        let data = runtime.chartData[currentTF]

        if (!dateStr) {
            window.alert('Pick a date first.')
            return
        }

        let index = getFirstIndexByDate(data, dateStr)
        if (index < 0 && runtime.sourceFiles[currentTF]) {
            const refreshedText = await runtime.sourceFiles[currentTF]!.text()
            const refreshedData = parseCsvText(refreshedText)
            runtime.chartData[currentTF] = refreshedData
            data = refreshedData
            index = getFirstIndexByDate(data, dateStr)
        }

        if (!data.length) {
            window.alert('Load chart data before jumping to a date.')
            return
        }

        if (index < 0) {
            window.alert(`No data found for ${dateStr} on the current timeframe after reloading the source CSV.`)
            return
        }

        const visibleCount = clamp(runtime.visibleCount, 10, Math.max(data.length, 10))
        runtime.visibleCount = visibleCount
        runtime.viewStart = clamp(index - visibleCount / 2, 0, Math.max(data.length - visibleCount, 0))
        runtime.isAutoScaled = true
        setJumpDate(dateStr)
        drawCanvas()
    }

    /**
     * Locate a candle by exact time and position the chart view to it.
     *
     * Searches for the candle matching `dateStr` + `timeStr`, trying both
     * space-separated and T-separated formats because CSV sources vary.
     * If the candle is not found in memory, attempts a re-read of the source
     * file before giving up.
     *
     * Args:
     *     dateStr: Date in "YYYY-MM-DD" format.
     *     timeStr: Time in "HH:MM" 24-hour format.
     *
     * Returns:
     *     True if the candle was found and the view was positioned. False if
     *     no data is loaded or no matching candle exists.
     *
     * Side effects:
     *     May re-parse the source CSV into `runtime.chartData`.
     *     Sets `runtime.viewStart`, `runtime.visibleCount`, `runtime.isAutoScaled`.
     *     Sets `runtime.candleFilterMinute` to `{dateStr}T{timeStr}`.
     *     Calls `setJumpDate`, `setCandleFilterMinute`, `setRenderAfterFilterMinute`.
     *     Calls `drawCanvas()` to re-render.
     */
    const addBacktestSection = async (dateStr: string, timeStr: string): Promise<boolean> => {
        const runtime = runtimeRef.current
        const currentTF = currentTfRef.current
        let data = runtime.chartData[currentTF]

        if (!data.length) {
            window.alert('Load chart data before adding a backtest section.')
            return false
        }

        const roundedTimeStr = roundTimeToTimeframe(timeStr, currentTF)

        // Find the first candle for this date, then scan linearly for the specific time.
        // Uses the same date-first approach as jumpToDate (via getFirstIndexByDate) rather
        // than binary search on exact time, because binary search is fragile with unsorted
        // data and varying separator formats.
        const findIndexByDateAndTime = (candles: Candle[], date: string, time: string): number => {
            const dateStartIndex = getFirstIndexByDate(candles, date)
            if (dateStartIndex < 0) return -1
            for (let i = dateStartIndex; i < candles.length; i += 1) {
                const t = candles[i].time
                if (!t.startsWith(date)) break
                if (t.includes(time)) return i
            }
            return -1
        }

        let index = findIndexByDateAndTime(data, dateStr, roundedTimeStr)

        if (index < 0 && runtime.sourceFiles[currentTF]) {
            const refreshedText = await runtime.sourceFiles[currentTF]!.text()
            const refreshedData = parseCsvText(refreshedText)
            runtime.chartData[currentTF] = refreshedData
            data = refreshedData
            index = findIndexByDateAndTime(data, dateStr, roundedTimeStr)
        }

        if (index < 0) {
            window.alert(`No data found for ${dateStr} at ${roundedTimeStr} on the current timeframe.`)
            return false
        }

        const visibleCount = clamp(runtime.visibleCount, 10, Math.max(data.length, 10))
        runtime.visibleCount = visibleCount
        runtime.viewStart = clamp(index - visibleCount / 2, 0, Math.max(data.length - visibleCount, 0))
        runtime.isAutoScaled = true

        const filterValue = `${dateStr}T${roundedTimeStr}`
        runtime.candleFilterMinute = filterValue
        runtime.renderAfterFilterMinute = false
        setJumpDate(dateStr)
        setCandleFilterMinute && setCandleFilterMinute(filterValue)
        setRenderAfterFilterMinute && setRenderAfterFilterMinute(false)
        drawCanvas()

        return true
    }

    const toggleDrawMode = () => {
        const next = !drawModeRef.current
        drawModeRef.current = next
        setDrawMode(next)
        if (!next) setDrawMenu(null)
        if (chartCanvasRef.current) chartCanvasRef.current.style.cursor = 'crosshair'
        drawCanvas()
    }

    const toggleDaySeparators = () => {
        const next = !showDaySeparatorsRef.current
        showDaySeparatorsRef.current = next
        runtimeRef.current.showDaySeparators = next
        setShowDaySeparators(next)
        drawCanvas()
    }

    const removeDrawing = (id: number) => {
        const nextDrawings = runtimeRef.current.drawings.filter((item) => item.id !== id)
        runtimeRef.current.drawings = nextDrawings
        setDrawings(nextDrawings)
        if (runtimeRef.current.selectedDrawingId === id) {
            runtimeRef.current.selectedDrawingId = null
            setSelectedDrawingId && setSelectedDrawingId(null)
        }
    }

    const findTimeByDayAndClock = (data: typeof runtimeRef.current.chartData.m1, day: string, clock: string) => {
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

    const findPreviousClockClose = (data: typeof runtimeRef.current.chartData.m1, beforeIndex: number, clock: string) => {
        for (let i = beforeIndex - 1; i >= 0; i -= 1) {
            if (data[i].time.includes(clock)) return data[i]
        }
        return null
    }

    const findPriorClockAcrossDays = (
        data: typeof runtimeRef.current.chartData.m1,
        startDay: string,
        clock: string,
    ) => {
        let day = startDay
        while (true) {
            const candle = findTimeByDayAndClock(data, day, clock)
            if (candle) return { day, candle }

            const previousDay = getPreviousDateString(day)
            if (previousDay === day) return null
            if (!data.length || previousDay < data[0].time.slice(0, 10)) return null
            day = previousDay
        }
    }

    const findSessionOpenOnPreviousDay = (data: typeof runtimeRef.current.chartData.m1, selectedDay: string) => {
        const previousDay = getPreviousDateString(selectedDay)
        for (let i = 0; i < data.length; i += 1) {
            if (!data[i].time.startsWith(previousDay)) continue
            const timePart = data[i].time.includes(' ')
                ? data[i].time.split(' ')[1]
                : data[i].time.includes('T')
                    ? data[i].time.split('T')[1]
                    : ''
            if (timePart.startsWith('18:00')) return data[i]
        }
        return null
    }

    const buildSessionGapDrawing = (
        type: 'ORG' | 'NDOG' | 'NWOG',
        gapTime: string,
        prevClose: number,
        sessionOpen: number,
    ): DrawingDraft => {
        const top = Math.max(prevClose, sessionOpen)
        const bot = Math.min(prevClose, sessionOpen)

        if (type === 'ORG') {
            return {
                type,
                time: gapTime,
                top,
                bot,
                lengthMinutes: null,
                price1614: prevClose,
                price0930: sessionOpen,
            }
        }

        const fill = type === 'NDOG' ? 'rgba(59, 130, 246, 0.14)' : 'rgba(168, 85, 247, 0.14)'
        const border = type === 'NDOG' ? 'rgba(59, 130, 246, 0.65)' : 'rgba(168, 85, 247, 0.72)'

        return {
            type,
            time: gapTime,
            top,
            bot,
            lengthMinutes: null,
            price1614: prevClose,
            price0930: sessionOpen,
            fillColor: fill,
            borderColor: border,
        } as DrawingDraft
    }

    const listAvailableDaysUntil = (data: typeof runtimeRef.current.chartData.m1, endDay: string) => {
        const days: string[] = []
        let lastDay = ''
        for (let i = 0; i < data.length; i += 1) {
            const day = data[i].time.slice(0, 10)
            if (day > endDay) continue
            if (day !== lastDay) {
                days.push(day)
                lastDay = day
            }
        }
        return days
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
    const getCandlesInTimeRange = (
        data: typeof runtimeRef.current.chartData.m1,
        dateStr: string,
        startHHMM: string,
        endHHMM: string,
    ): Candle[] => {
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
    const generateMarketAnnotations = (dateStr: string): void => {
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
        generateMarketAnnotations(dateStr)

        // 8. Hide top bar
        if (onHideTopBar) onHideTopBar()

        setJumpDate(dateStr)
        drawCanvas()
    }

    /**
     * Export all trading days as annotated chart images.
     * Iterates through all dates in m1 data, prepares each day view, captures canvas, downloads image.
     */
    const exportAllDays = async (): Promise<void> => {
        const m1Data = runtimeRef.current.chartData.m1
        if (!m1Data || m1Data.length === 0) {
            window.alert('Load M1 data first.')
            return
        }

        // Get all unique dates
        const dateSet = new Set<string>()
        for (const candle of m1Data) {
            dateSet.add(candle.time.slice(0, 10))
        }
        const dates = Array.from(dateSet).sort()

        if (dates.length === 0) {
            window.alert('No dates found in M1 data.')
            return
        }

        console.log(`Exporting ${dates.length} days...`)

        for (let i = 0; i < dates.length; i++) {
            const date = dates[i]
            console.log(`[${i + 1}/${dates.length}] ${date}`)

            // Prepare day view
            await prepareDayView(date)

            // Wait for render
            await new Promise((resolve) => setTimeout(resolve, 300))

            // Capture and download
            const chartCanvas = chartCanvasRef.current
            const yAxisCanvas = yAxisCanvasRef.current
            const xAxisCanvas = xAxisCanvasRef.current

            if (chartCanvas && yAxisCanvas && xAxisCanvas) {
                // Hide crosshair for clean capture
                const hadCrosshair = runtimeRef.current.crosshairActive
                runtimeRef.current.crosshairActive = false
                drawCanvas()

                await new Promise((resolve) => setTimeout(resolve, 100))

                // Capture to blob and download
                const width = chartCanvas.width + yAxisCanvas.width
                const height = chartCanvas.height + xAxisCanvas.height
                const offscreen = document.createElement('canvas')
                offscreen.width = width
                offscreen.height = height
                const ctx = offscreen.getContext('2d')

                if (ctx) {
                    ctx.drawImage(chartCanvas, 0, 0)
                    ctx.drawImage(yAxisCanvas, chartCanvas.width, 0)
                    ctx.drawImage(xAxisCanvas, 0, chartCanvas.height)

                    offscreen.toBlob((blob) => {
                        if (blob) {
                            const url = URL.createObjectURL(blob)
                            const anchor = document.createElement('a')
                            anchor.href = url
                            anchor.download = `${date}.png`
                            document.body.appendChild(anchor)
                            anchor.click()
                            document.body.removeChild(anchor)
                            URL.revokeObjectURL(url)
                        }
                    }, 'image/png')
                }

                // Restore crosshair
                if (hadCrosshair) {
                    runtimeRef.current.crosshairActive = true
                    drawCanvas()
                }
            }

            // Wait between downloads to avoid browser blocking
            await new Promise((resolve) => setTimeout(resolve, 500))
        }

        console.log('Export complete!')
        window.alert(`Exported ${dates.length} days.`)
    }

    const createDrawing = (type: ToolType) => {
        const runtime = runtimeRef.current
        if (type === 'FIB') {
            runtime.pendingFibPlacement = { firstPoint: null, templateKey: 'fibo_quadrant' }
            setFibPlacementStep('pick-first')
            drawMenuOpenRef.current = false
            setDrawMenu(null)
            runtime.selectedCandleIndex = null
            drawCanvas()
            return
        }

        if (type === 'ENTRY') {
            runtime.pendingFibPlacement = null
            setFibPlacementStep(null)
            runtime.pendingEntryPlacement = { firstPoint: null, secondPoint: null, thirdPoint: null, fourthPoint: null }
            setEntryPlacementStep('pick-entry')
            drawMenuOpenRef.current = false
            setDrawMenu(null)
            runtime.selectedCandleIndex = null
            drawCanvas()
            return
        }

        if (type === 'MKT_ANNOT') {
            runtime.pendingFibPlacement = null
            setFibPlacementStep(null)
            runtime.pendingEntryPlacement = null
            setEntryPlacementStep(null)
            setMktAnnotDialogOpen(true)
            drawMenuOpenRef.current = false
            setDrawMenu(null)
            runtime.selectedCandleIndex = null
            drawCanvas()
            return
        }

        runtime.pendingFibPlacement = null
        setFibPlacementStep(null)
        runtime.pendingEntryPlacement = null
        setEntryPlacementStep(null)

        const data = runtime.chartData[currentTfRef.current]
        const index = runtime.selectedCandleIndex
        if (index === null || !data[index]) {
            setDrawMenu(null)
            drawMenuOpenRef.current = false
            return
        }

        const candle = data[index]
        let newDrawing: DrawingDraft | null = null

        if (type === 'ORG_RECENT_5' || type === 'GAP_RECENT_5') {
            const m1Data = runtime.chartData.m1
            if (!m1Data || m1Data.length === 0) {
                window.alert('Load M1 data first to calculate recent gaps.')
            } else {
                const selectedDay = candle.time.slice(0, 10)
                const availableDays = listAvailableDaysUntil(m1Data, selectedDay)
                const generated: DrawingDraft[] = []

                for (let i = availableDays.length - 1; i >= 0 && generated.length < 5; i -= 1) {
                    const day = availableDays[i]

                    if (type === 'ORG_RECENT_5') {
                        const openCandle = findTimeByDayAndClock(m1Data, day, '09:30')
                        if (!openCandle) continue
                        const prev1614Close = findPreviousClockClose(m1Data, m1Data.indexOf(openCandle), '16:14')
                        if (!prev1614Close) continue
                        generated.push(buildSessionGapDrawing('ORG', openCandle.time, prev1614Close.close, openCandle.open))
                    } else {
                        const dow = new Date(`${day}T12:00:00`).getDay()
                        const effectiveType: 'NDOG' | 'NWOG' = dow === 0 || dow === 1 ? 'NWOG' : 'NDOG'
                        const openDay = getPreviousDateString(day)
                        const openCandle = findSessionOpenOnPreviousDay(m1Data, day)
                        if (!openCandle) continue
                        const priorClose = findPriorClockAcrossDays(m1Data, openDay, '16:14')
                        if (!priorClose) continue
                        generated.push(buildSessionGapDrawing(effectiveType, openCandle.time, priorClose.candle.close, openCandle.open))
                    }
                }

                if (generated.length > 0) {
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

                    const label = type === 'ORG_RECENT_5' ? 'ORG' : 'NDOG/NWOG'
                    window.alert(`Added ${generated.length} recent ${label} gap(s) to the object list.`)
                } else {
                    const label = type === 'ORG_RECENT_5' ? 'ORG' : 'NDOG/NWOG'
                    window.alert(`No recent ${label} gap could be calculated from current data.`)
                }
            }

            runtime.selectedCandleIndex = null
            drawMenuOpenRef.current = false
            setDrawMenu(null)
            return
        }

        if (type === 'FVG') {
            if (index > 0 && index < data.length - 1) {
                const prev = data[index - 1]
                const next = data[index + 1]
                if (prev.high < next.low) {
                    newDrawing = { type: 'FVG', time: candle.time, top: next.low, bot: prev.high, lengthMinutes: null, color: 'rgba(34, 197, 94, 0.25)', border: 'rgba(34, 197, 94, 0.8)' }
                } else if (prev.low > next.high) {
                    newDrawing = { type: 'FVG', time: candle.time, top: prev.low, bot: next.high, lengthMinutes: null, color: 'rgba(239, 68, 68, 0.25)', border: 'rgba(239, 68, 68, 0.8)' }
                } else {
                    window.alert('No FVG detected on this candle. (No gap between i-1 and i+1)')
                }
            } else {
                window.alert('Cannot calculate FVG on boundary candles.')
            }
        } else if (type === 'OB') {
            const isBullishCandle = candle.close > candle.open
            const obColor = isBullishCandle ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'
            newDrawing = { type: 'OB', time: candle.time, top: Math.max(candle.open, candle.close), bot: Math.min(candle.open, candle.close), lengthMinutes: 240, color: obColor }
        } else if (type === 'VLINE') {
            // vertical line at selected candle time
            if (!candle) {
                window.alert('Select a candle to place a vertical line.')
            } else {
                newDrawing = { type: 'VLINE', time: candle.time, color: '#7c3aed' }
            }
        } else if (type === 'FVG_FIRST') {
            // behave like normal FVG but force purple color regardless of direction
            if (index > 0 && index < data.length - 1) {
                const prev = data[index - 1]
                const next = data[index + 1]
                if (prev.high < next.low) {
                    newDrawing = { type: 'FVG', time: candle.time, top: next.low, bot: prev.high, lengthMinutes: null, color: 'rgba(124, 58, 237, 0.25)', border: 'rgba(124, 58, 237, 0.8)' }
                } else if (prev.low > next.high) {
                    newDrawing = { type: 'FVG', time: candle.time, top: prev.low, bot: next.high, lengthMinutes: null, color: 'rgba(124, 58, 237, 0.25)', border: 'rgba(124, 58, 237, 0.8)' }
                } else {
                    window.alert('No FVG detected on this candle. (No gap between i-1 and i+1)')
                }
            } else {
                window.alert('Cannot calculate FVG on boundary candles.')
            }
        } else if (type === 'EQH' || type === 'SH') {
            newDrawing = { type, time: candle.time, price: candle.high, lengthMinutes: null, color: '#000000' }
        } else if (type === 'EQL' || type === 'SL') {
            newDrawing = { type, time: candle.time, price: candle.low, lengthMinutes: null, color: '#000000' }
        } else if (type === 'ORG') {
            const m1Data = runtime.chartData.m1
            if (!m1Data || m1Data.length === 0) {
                window.alert('Load M1 data first to calculate precise ORG.')
            } else {
                const targetDay = candle.time.slice(0, 10)
                const openCandle = findTimeByDayAndClock(m1Data, targetDay, '09:30')
                if (!openCandle) {
                    window.alert(`No 09:30 candle found for ${targetDay}.`)
                } else {
                    const prev1614Close = findPreviousClockClose(m1Data, m1Data.indexOf(openCandle), '16:14')
                    if (!prev1614Close) {
                        window.alert('No previous 16:14 candle found.')
                    } else {
                        newDrawing = buildSessionGapDrawing('ORG', openCandle.time, prev1614Close.close, openCandle.open)
                    }
                }
            }
        } else if (type === 'NDOG' || type === 'NWOG') {
            const m1Data = runtime.chartData.m1
            if (!m1Data || m1Data.length === 0) {
                window.alert('Load M1 data first to calculate precise opening gaps.')
            } else {
                const selectedDay = candle.time.slice(0, 10)
                const selectedDow = new Date(`${selectedDay}T12:00:00`).getDay()
                const effectiveType: 'NDOG' | 'NWOG' = selectedDow === 0 || selectedDow === 1 ? 'NWOG' : 'NDOG'

                const openDay = getPreviousDateString(selectedDay)
                const openCandle = findSessionOpenOnPreviousDay(m1Data, selectedDay)
                if (!openCandle) {
                    window.alert(`No 18:00 open candle found for ${openDay}.`)
                } else {
                    const priorClose = findPriorClockAcrossDays(m1Data, openDay, '16:14')
                    if (!priorClose) {
                        window.alert('No earlier 16:14 close found before the 18:00 open day.')
                    } else {
                        newDrawing = buildSessionGapDrawing(effectiveType, openCandle.time, priorClose.candle.close, openCandle.open)
                    }
                }
            }
        }

        if (newDrawing) {
            const nextDrawings = [...runtime.drawings, { ...newDrawing, id: runtime.drawingIdCounter }] as Drawing[]
            runtime.drawingIdCounter += 1
            runtime.drawings = nextDrawings
            setDrawings(nextDrawings)
            // select newly created drawing
            const newId = runtime.drawingIdCounter - 1
            runtime.selectedDrawingId = newId
            setSelectedDrawingId && setSelectedDrawingId(newId)
            drawModeRef.current = false
            setDrawMode(false)
        }

        runtime.selectedCandleIndex = null
        runtime.pendingFibPlacement = null
        setFibPlacementStep(null)
        drawMenuOpenRef.current = false
        setDrawMenu(null)
    }

    const loadCsvFiles = createLoadCsvFiles({ runtimeRef, currentTfRef, drawCanvas })

    return {
        changeTimeframe,
        jumpToDate,
        addBacktestSection,
        toggleDrawMode,
        toggleDaySeparators,
        loadCsvFiles,
        removeDrawing,
        createDrawing,
        generateMarketAnnotations,
        prepareDayView,
        exportAllDays,
        handleChartMouseDown,
        handleChartWheel,
        handleChartMouseLeave,
        handleYAxisMouseDown,
        handleYAxisDoubleClick,
    }
}
