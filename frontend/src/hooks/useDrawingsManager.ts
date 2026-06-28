import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { Candle, Timeframe, ToolType } from '../types/chart'
import type { ChartRuntimeState, DrawMenuState } from '../types/state'
import type { Drawing, DrawingDraft } from '../types/drawings/index'
import { findCandleByTime, getPreviousDateString } from '../utils/time'
import { createDrawingByType } from './useDrawingCreator'

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
        createDrawingByType(type, runtime, {
            currentTfRef,
            setDrawings,
            setDrawMenu,
            setFibPlacementStep,
            setEntryPlacementStep,
            setMktAnnotDialogOpen,
            setDrawMode,
            drawCanvas,
        }, {
            findTimeByDayAndClock,
            findPreviousClockClose,
            findPriorClockAcrossDays,
            findSessionOpenOnPreviousDay,
            buildSessionGapDrawing,
            listAvailableDaysUntil,
        })
        drawMenuOpenRef.current = false
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
