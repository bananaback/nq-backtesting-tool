import type { Dispatch, RefObject, SetStateAction, MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from 'react'
import type { ChartRuntimeState, Drawing, DrawingDraft, DrawMenuState, Timeframe, ToolType } from '../chartTypes'
import { clamp, getFirstIndexByDate, getIndexByTime, getPreviousDateString, parseCsvText } from '../chartUtils'
import { createLoadCsvFiles } from './loadTradingChartCsvFiles'

type TradingChartActionsDeps = {
    chartCanvasRef: RefObject<HTMLCanvasElement | null>
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
    drawCanvas: () => void
}

export function createTradingChartActions({
    chartCanvasRef,
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
    drawCanvas,
}: TradingChartActionsDeps) {
    const handleChartMouseDown = (event: ReactMouseEvent<HTMLCanvasElement>) => {
        const runtime = runtimeRef.current
        runtime.mouseDownX = event.clientX
        runtime.mouseDownY = event.clientY

        if (!drawMenuOpenRef.current) {
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
            if (data[i].time.startsWith(day) && data[i].time.includes(clock)) {
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

    const createDrawing = (type: ToolType) => {
        const runtime = runtimeRef.current
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
            newDrawing = { type: 'OB', time: candle.time, price: candle.open, lengthMinutes: null, color: '#3b82f6' }
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
            newDrawing = { type, time: candle.time, price: candle.high, lengthMinutes: null, color: '#ef4444' }
        } else if (type === 'EQL' || type === 'SL') {
            newDrawing = { type, time: candle.time, price: candle.low, lengthMinutes: null, color: '#22c55e' }
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
        }

        runtime.selectedCandleIndex = null
        drawMenuOpenRef.current = false
        setDrawMenu(null)
    }

    const loadCsvFiles = createLoadCsvFiles({ runtimeRef, currentTfRef, drawCanvas })

    return {
        changeTimeframe,
        jumpToDate,
        toggleDrawMode,
        toggleDaySeparators,
        loadCsvFiles,
        removeDrawing,
        createDrawing,
        handleChartMouseDown,
        handleChartWheel,
        handleChartMouseLeave,
        handleYAxisMouseDown,
        handleYAxisDoubleClick,
    }
}
