import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { Candle, Timeframe } from '../types/chart'
import type { ChartRuntimeState } from '../types/state'
import type { DrawingDraft } from '../types/drawings/index'
import type { Drawing } from '../types/drawings/index'
import { generateMarketAnnotations } from './useMarketAnnotationGenerator'
import { prepareDayView } from './usePrepareDayView'

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
    onHideTopBar,
    drawCanvas,
    findTimeByDayAndClock,
    findPreviousClockClose,
    findPriorClockAcrossDays,
    findSessionOpenOnPreviousDay,
    buildSessionGapDrawing,
}: MarketAnnotationsDeps) {
    const wrappedGenerate = async (dateStr: string): Promise<void> => {
        const runtime = runtimeRef.current
        const deps = {
            findTimeByDayAndClock,
            findPreviousClockClose,
            findPriorClockAcrossDays,
            findSessionOpenOnPreviousDay,
            buildSessionGapDrawing,
            setDrawings: setDrawings as (drawings: Drawing[]) => void,
        }
        await generateMarketAnnotations(dateStr, runtime, deps)
    }

    const wrappedPrepare = async (dateStr: string): Promise<void> => {
        const runtime = runtimeRef.current
        const deps = {
            currentTfRef,
            findTimeByDayAndClock,
            setDrawings: setDrawings as (drawings: Drawing[]) => void,
            setSelectedDrawingId: setSelectedDrawingId as ((id: number | null) => void) | undefined,
            setJumpDate,
            onHideTopBar,
            drawCanvas,
        }
        await prepareDayView(dateStr, runtime, deps, wrappedGenerate)
    }

    return { generateMarketAnnotations: wrappedGenerate, prepareDayView: wrappedPrepare }
}
