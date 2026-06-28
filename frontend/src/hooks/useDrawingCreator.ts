import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { Candle, Timeframe, ToolType } from '../types/chart'
import type { ChartRuntimeState, DrawMenuState } from '../types/state'
import type { Drawing, DrawingDraft } from '../types/drawings/index'
import { getPreviousDateString } from '../utils/time'

type CreateDrawingDeps = {
    currentTfRef: RefObject<Timeframe>
    setDrawings: Dispatch<SetStateAction<Drawing[]>>
    setDrawMenu: Dispatch<SetStateAction<DrawMenuState | null>>
    setFibPlacementStep: Dispatch<SetStateAction<'pick-first' | 'pick-second' | null>>
    setEntryPlacementStep: Dispatch<SetStateAction<'pick-entry' | 'pick-sl' | 'pick-tp' | 'pick-width' | null>>
    setMktAnnotDialogOpen: Dispatch<SetStateAction<boolean>>
    setDrawMode: Dispatch<SetStateAction<boolean>>
    drawCanvas: () => void
}

type CreateDrawingHelpers = {
    findTimeByDayAndClock: (data: Candle[], day: string, clock: string) => Candle | null
    findPreviousClockClose: (data: Candle[], beforeIndex: number, clock: string) => Candle | null
    findPriorClockAcrossDays: (data: Candle[], startDay: string, clock: string) => { day: string; candle: Candle } | null
    findSessionOpenOnPreviousDay: (data: Candle[], selectedDay: string) => Candle | null
    buildSessionGapDrawing: (type: 'ORG' | 'NDOG' | 'NWOG', gapTime: string, prevClose: number, sessionOpen: number) => DrawingDraft
    listAvailableDaysUntil: (data: Candle[], endDay: string) => string[]
}

export function createDrawingByType(
    type: ToolType,
    runtime: ChartRuntimeState,
    deps: CreateDrawingDeps,
    helpers: CreateDrawingHelpers,
) {
    const {
        currentTfRef,
        setDrawings,
        setDrawMenu,
        setFibPlacementStep,
        setEntryPlacementStep,
        setMktAnnotDialogOpen,
        setDrawMode,
        drawCanvas,
    } = deps

    const {
        findTimeByDayAndClock,
        findPreviousClockClose,
        findPriorClockAcrossDays,
        findSessionOpenOnPreviousDay,
        buildSessionGapDrawing,
        listAvailableDaysUntil,
    } = helpers

    if (type === 'FIB') {
        runtime.pendingFibPlacement = { firstPoint: null, templateKey: 'fibo_quadrant' }
        setFibPlacementStep('pick-first')
        runtime.selectedCandleIndex = null
        setDrawMenu(null)
        drawCanvas()
        return
    }

    if (type === 'ENTRY') {
        runtime.pendingFibPlacement = null
        setFibPlacementStep(null)
        runtime.pendingEntryPlacement = { firstPoint: null, secondPoint: null, thirdPoint: null, fourthPoint: null }
        setEntryPlacementStep('pick-entry')
        runtime.selectedCandleIndex = null
        setDrawMenu(null)
        drawCanvas()
        return
    }

    if (type === 'MKT_ANNOT') {
        runtime.pendingFibPlacement = null
        setFibPlacementStep(null)
        runtime.pendingEntryPlacement = null
        setEntryPlacementStep(null)
        setMktAnnotDialogOpen(true)
        runtime.selectedCandleIndex = null
        setDrawMenu(null)
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

                const label = type === 'ORG_RECENT_5' ? 'ORG' : 'NDOG/NWOG'
                window.alert(`Added ${generated.length} recent ${label} gap(s) to the object list.`)
            } else {
                const label = type === 'ORG_RECENT_5' ? 'ORG' : 'NDOG/NWOG'
                window.alert(`No recent ${label} gap could be calculated from current data.`)
            }
        }

        runtime.selectedCandleIndex = null
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
        if (!candle) {
            window.alert('Select a candle to place a vertical line.')
        } else {
            newDrawing = { type: 'VLINE', time: candle.time, color: '#7c3aed' }
        }
    } else if (type === 'FVG_FIRST') {
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
        setDrawMode(false)
    }

    runtime.selectedCandleIndex = null
    runtime.pendingFibPlacement = null
    setFibPlacementStep(null)
    setDrawMenu(null)
}
