import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { Candle, Timeframe, ToolType } from '../types/chart'
import type { ChartRuntimeState, DrawMenuState } from '../types/state'
import type { Drawing, DrawingDraft } from '../types/drawings/index'
import { findCandleByTime, getPreviousDateString } from '../utils/time'

type DrawingsManagerDeps = {
    runtimeRef: RefObject<ChartRuntimeState>
    currentTfRef: RefObject<Timeframe>
    drawModeRef: RefObject<boolean>
    drawMenuOpenRef: RefObject<boolean>
    setDrawMenu: Dispatch<SetStateAction<DrawMenuState>>
    setDrawings: Dispatch<SetStateAction<Drawing[]>>
    setSelectedDrawingId?: Dispatch<SetStateAction<number | null>>
    setFibPlacementStep: Dispatch<SetStateAction<'pick-first' | 'pick-second' | null>>
    setEntryPlacementStep: Dispatch<SetStateAction<'pick-entry' | 'pick-sl' | 'pick-tp' | 'pick-width' | null>>
    setDrawMode: Dispatch<SetStateAction<boolean>>
    setMktAnnotDialogOpen: Dispatch<SetStateAction<boolean>>
    drawCanvas: () => void
}

export function createDrawingsManager({
    runtimeRef,
    currentTfRef,
    drawModeRef,
    drawMenuOpenRef,
    setDrawMenu,
    setDrawings,
    setSelectedDrawingId,
    setFibPlacementStep,
    setEntryPlacementStep,
    setDrawMode,
    setMktAnnotDialogOpen,
    drawCanvas,
}: DrawingsManagerDeps) {
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
        return findCandleByTime(data, day + 'T' + clock)
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
        let iterations = 0
        while (iterations < 7) {
            const candle = findTimeByDayAndClock(data, day, clock)
            if (candle) return { day, candle }

            const previousDay = getPreviousDateString(day)
            if (previousDay === day) return null
            day = previousDay
            iterations += 1
        }
        return null
    }

    const findSessionOpenOnPreviousDay = (data: typeof runtimeRef.current.chartData.m1, selectedDay: string) => {
        const previousDay = getPreviousDateString(selectedDay)
        return findCandleByTime(data, previousDay + 'T18:00')
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

                    // Do not auto-select after drawing creation

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
            // Do not auto-select after drawing creation
            drawModeRef.current = false
            setDrawMode(false)
        }

        runtime.selectedCandleIndex = null
        runtime.pendingFibPlacement = null
        setFibPlacementStep(null)
        drawMenuOpenRef.current = false
        setDrawMenu(null)
    }

    return {
        removeDrawing,
        createDrawing,
        findTimeByDayAndClock,
        findPreviousClockClose,
        findPriorClockAcrossDays,
        findSessionOpenOnPreviousDay,
        buildSessionGapDrawing,
        listAvailableDaysUntil,
    }
}
