import type { RefObject, Dispatch, SetStateAction } from 'react'
import type { Timeframe } from '../types/chart'
import type { ChartRuntimeState, DrawMenuState } from '../types/state'
import type { Drawing } from '../types/drawings/index'
import { getIndexByTime, getTimeframeMinutes } from '../utils/time'
import { computeEntryStatus } from '../utils/drawing'

type DrawingMutationsDeps = {
    runtimeRef: RefObject<ChartRuntimeState>
    currentTfRef: RefObject<Timeframe>
    setDrawings: Dispatch<SetStateAction<Drawing[]>>
    drawCanvas: () => void
    setFibPlacementStep: Dispatch<SetStateAction<'pick-first' | 'pick-second' | null>>
    setEntryPlacementStep: Dispatch<SetStateAction<'pick-entry' | 'pick-sl' | 'pick-tp' | 'pick-width' | null>>
    drawMenuOpenRef: RefObject<boolean>
    setDrawMenu: Dispatch<SetStateAction<DrawMenuState>>
}

export function createDrawingMutations({
    runtimeRef,
    currentTfRef,
    setDrawings,
    drawCanvas,
    setFibPlacementStep,
    setEntryPlacementStep,
    drawMenuOpenRef,
    setDrawMenu,
}: DrawingMutationsDeps) {
    const updateDrawingLengthMinutes = (drawingId: number, lengthMinutes: number | null) => {
        const nextDrawings = runtimeRef.current.drawings.map((drawing) => {
            if (drawing.id !== drawingId) return drawing

            if (drawing.type === 'VLINE' || drawing.type === 'FIB') {
                return drawing
            }

            if (drawing.type === 'OB') {
                if (lengthMinutes === null) return drawing
                return { ...drawing, lengthMinutes }
            }

            if (drawing.type === 'ENTRY') {
                if (lengthMinutes === null) return drawing
                const timeframeMinutes = getTimeframeMinutes(currentTfRef.current)
                const widthInCandles = Math.max(1, Math.round(lengthMinutes / timeframeMinutes))
                const entryIndex = getIndexByTime(runtimeRef.current.chartData[currentTfRef.current], drawing.time)
                const status = computeEntryStatus(
                    runtimeRef.current.chartData[currentTfRef.current],
                    entryIndex,
                    widthInCandles,
                    drawing.direction,
                    drawing.stopLossPrice,
                    drawing.takeProfitPrice
                )
                return { ...drawing, widthInCandles, lengthMinutes, status }
            }

            return { ...drawing, lengthMinutes }
        })

        runtimeRef.current.drawings = nextDrawings
        setDrawings(nextDrawings)
        drawCanvas()
    }

    const updateFibDrawing = (drawingId: number, updates: Partial<Extract<Drawing, { type: 'FIB' }>>) => {
        const nextDrawings = runtimeRef.current.drawings.map((drawing) => {
            if (drawing.id !== drawingId || drawing.type !== 'FIB') return drawing
            return { ...drawing, ...updates }
        })

        runtimeRef.current.drawings = nextDrawings
        setDrawings(nextDrawings)
        drawCanvas()
    }

    const cancelFibPlacement = () => {
        runtimeRef.current.pendingFibPlacement = null
        setFibPlacementStep(null)
        drawMenuOpenRef.current = false
        setDrawMenu(null)
        drawCanvas()
    }

    const cancelEntryPlacement = () => {
        runtimeRef.current.pendingEntryPlacement = null
        setEntryPlacementStep(null)
        drawMenuOpenRef.current = false
        setDrawMenu(null)
        drawCanvas()
    }

    return { updateDrawingLengthMinutes, updateFibDrawing, cancelFibPlacement, cancelEntryPlacement }
}
