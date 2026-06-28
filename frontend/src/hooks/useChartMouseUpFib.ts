import type { Dispatch, SetStateAction } from 'react'
import type { Candle } from '../types/chart'
import type { ChartRuntimeState } from '../types/state'
import { getDefaultFibLevels } from '../constants/chart'
import { snapPriceToCandleOHLC } from '../utils/drawing'

export function handleFibPlacement(
    runtime: ChartRuntimeState,
    canvas: HTMLCanvasElement,
    candleSpace: number,
    data: Candle[],
    hoverIndex: number,
    cursorPrice: number,
    snappedPrice: number,
    setFibPlacementStep: Dispatch<SetStateAction<'pick-first' | 'pick-second' | null>>,
    setDrawings: Dispatch<SetStateAction<ChartRuntimeState['drawings']>>,
    toggleDrawMode: () => void,
    drawCanvas: () => void,
): boolean {
    const pending = runtime.pendingFibPlacement
    if (!pending) return false

    if (pending.firstPoint) {
        const newId = runtime.drawingIdCounter
        const nextDrawing = {
            id: newId,
            type: 'FIB' as const,
            time: pending.firstPoint.time,
            time2: data[hoverIndex].time,
            price1: pending.firstPoint.price,
            price2: snappedPrice,
            templateKey: pending.templateKey,
            extendRight: false,
            reverse: false,
            lineStyle: 'normal' as const,
            lineWidth: 1.5,
            levels: getDefaultFibLevels(pending.templateKey),
        }
        runtime.drawingIdCounter += 1
        runtime.drawings = [...runtime.drawings, nextDrawing]
        setDrawings(runtime.drawings)
        setFibPlacementStep(null)
        runtime.pendingFibPlacement = null
        toggleDrawMode()
        runtime.isDraggingChart = false
        runtime.isDraggingAxis = false
        canvas.style.cursor = 'crosshair'
        drawCanvas()
        return true
    }

    runtime.pendingFibPlacement = {
        firstPoint: { time: data[hoverIndex].time, price: snappedPrice },
        templateKey: pending.templateKey,
    }
    setFibPlacementStep('pick-second')
    runtime.isDraggingChart = false
    runtime.isDraggingAxis = false
    canvas.style.cursor = 'crosshair'
    drawCanvas()
    return true
}
