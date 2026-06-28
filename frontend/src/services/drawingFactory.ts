import type { Dispatch, SetStateAction, RefObject } from 'react'
import type { Candle, Timeframe, ToolType } from '../types/chart'
import type { ChartRuntimeState, DrawMenuState } from '../types/state'
import type { Drawing, DrawingDraft } from '../types/drawings/index'
import { getPreviousDateString } from '../utils/time'
import { findTimeByDayAndClock } from './marketAnnotationService'
import {
    findPreviousClockClose,
    findPriorClockAcrossDays,
    findSessionOpenOnPreviousDay,
    buildSessionGapDrawing,
    listAvailableDaysUntil,
    handleRecentGapDrawings,
} from './drawingValidation'

export function createDrawingLogic(
    type: ToolType,
    runtimeRef: RefObject<ChartRuntimeState>,
    currentTfRef: RefObject<Timeframe>,
    drawModeRef: RefObject<boolean>,
    drawMenuOpenRef: RefObject<boolean>,
    setDrawMenu: Dispatch<SetStateAction<DrawMenuState>>,
    setDrawings: Dispatch<SetStateAction<Drawing[]>>,
    setFibPlacementStep: Dispatch<SetStateAction<'pick-first' | 'pick-second' | null>>,
    setEntryPlacementStep: Dispatch<SetStateAction<'pick-entry' | 'pick-sl' | 'pick-tp' | 'pick-width' | null>>,
    setDrawMode: Dispatch<SetStateAction<boolean>>,
    setMktAnnotDialogOpen: Dispatch<SetStateAction<boolean>>,
    drawCanvas: () => void,
): void {
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
        handleRecentGapDrawings(type, runtime, candle, setDrawings)
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
