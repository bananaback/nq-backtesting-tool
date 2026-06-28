import type { RefObject, Dispatch, SetStateAction } from 'react'
import type { Timeframe } from '../types/chart'
import type { ChartRuntimeState, DrawMenuState } from '../types/state'
import { handleChartMouseMove } from './useChartMouseMove'
import { handleChartMouseUp, type MouseUpDeps } from './useChartMouseUp'

type WindowEventsDeps = {
    chartCanvasRef: RefObject<HTMLCanvasElement | null>
    yAxisCanvasRef: RefObject<HTMLCanvasElement | null>
    xAxisCanvasRef: RefObject<HTMLCanvasElement | null>
    runtimeRef: RefObject<ChartRuntimeState>
    currentTfRef: RefObject<Timeframe>
    drawModeRef: RefObject<boolean>
    drawMenuOpenRef: RefObject<boolean>
    setDrawMenu: Dispatch<SetStateAction<DrawMenuState>>
    setDrawings: Dispatch<SetStateAction<ChartRuntimeState['drawings']>>
    drawCanvas: () => void
    resizeCanvas: () => void
    setSelectedDrawingId: Dispatch<SetStateAction<number | null>>
    setFibPlacementStep: Dispatch<SetStateAction<'pick-first' | 'pick-second' | null>>
    cancelFibPlacement: () => void
    setEntryPlacementStep: Dispatch<SetStateAction<'pick-entry' | 'pick-sl' | 'pick-tp' | 'pick-width' | null>>
    cancelEntryPlacement: () => void
    removeDrawing: (id: number) => void
    setCandleFilterMinute: Dispatch<SetStateAction<string>>
    setRenderAfterFilterMinute: Dispatch<SetStateAction<boolean>>
    setIsPickingCandleFilter: Dispatch<SetStateAction<boolean>>
    toggleDrawMode: () => void
    exitFullscreenRef: RefObject<(() => void) | null>
}

/** Register window-level event listeners for resize, mouse move, mouse up, and mouse down.
 *
 * Binds resize, mousemove, mouseup, and mousedown events to enable chart interaction:
 * canvas resize, crosshair tracking, news hover detection, chart/axis dragging,
 * candle filter picking, fib/entry placement, draw menu, and drawing selection hit-test.
 *
 * Returns a cleanup function that removes all registered window event listeners.
 */
export function createWindowEvents({
    chartCanvasRef,
    yAxisCanvasRef,
    xAxisCanvasRef,
    runtimeRef,
    currentTfRef,
    drawModeRef,
    drawMenuOpenRef,
    setDrawMenu,
    setDrawings,
    drawCanvas,
    resizeCanvas,
    setSelectedDrawingId,
    setFibPlacementStep,
    cancelFibPlacement,
    setEntryPlacementStep,
    cancelEntryPlacement,
    removeDrawing,
    setCandleFilterMinute,
    setRenderAfterFilterMinute,
    setIsPickingCandleFilter,
    toggleDrawMode,
    exitFullscreenRef,
}: WindowEventsDeps): () => void {
    const handleResize = () => resizeCanvas()

    const handleMouseMove = (event: globalThis.MouseEvent) => {
        handleChartMouseMove(event, chartCanvasRef, runtimeRef, currentTfRef, drawCanvas)
    }

    const mouseUpDeps: MouseUpDeps = {
        chartCanvasRef,
        runtimeRef,
        currentTfRef,
        drawModeRef,
        drawMenuOpenRef,
        setDrawMenu,
        setDrawings,
        setSelectedDrawingId,
        setFibPlacementStep,
        cancelFibPlacement,
        setEntryPlacementStep,
        cancelEntryPlacement,
        setCandleFilterMinute,
        setRenderAfterFilterMinute,
        setIsPickingCandleFilter,
        toggleDrawMode,
        drawCanvas,
    }

    const handleMouseUp = (event: globalThis.MouseEvent) => {
        handleChartMouseUp(event, mouseUpDeps)
    }

    const handleMouseDown = (event: globalThis.MouseEvent) => {
        const target = event.target as HTMLElement | null
        if (target?.closest('.draw-menu')) return
        if (!target?.closest('.chart-canvas')) {
            drawMenuOpenRef.current = false
            setDrawMenu(null)
        }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousedown', handleMouseDown)

    return () => {
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
        window.removeEventListener('mousedown', handleMouseDown)
    }
}
