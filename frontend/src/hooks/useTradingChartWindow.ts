import type { RefObject, Dispatch, SetStateAction } from 'react'
import type { Timeframe } from '../types/chart'
import type { ChartRuntimeState, DrawMenuState } from '../types/state'
import { createKeyboardShortcuts } from './useKeyboardShortcuts'
import { createWindowEvents } from './useWindowEvents'

type TradingChartWindowDeps = {
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

/** Register window-level event listeners for the trading chart canvas.
 *
 * Binds resize, mouse, and keyboard events to enable chart interaction:
 * panning, zooming, drawing placement, draw mode toggle, fullscreen exit,
 * and candle filter picking.
 *
 * Args:
 *     chartCanvasRef: Ref to the chart canvas element.
 *     yAxisCanvasRef: Ref to the y-axis canvas element.
 *     xAxisCanvasRef: Ref to the x-axis canvas element.
 *     runtimeRef: Ref to the shared chart runtime state.
 *     currentTfRef: Ref to the current timeframe.
 *     drawModeRef: Ref indicating whether draw mode is active.
 *     drawMenuOpenRef: Ref indicating whether the draw menu is open.
 *     setDrawMenu: Setter for draw menu state.
 *     setDrawings: Setter for drawings array.
 *     drawCanvas: Function to re-render the chart.
 *     resizeCanvas: Function to resize the canvas.
 *     setSelectedDrawingId: Setter for selected drawing ID.
 *     setFibPlacementStep: Setter for Fibonacci placement step.
 *     cancelFibPlacement: Cancels current Fibonacci placement.
 *     setEntryPlacementStep: Setter for entry placement step.
 *     cancelEntryPlacement: Cancels current entry placement.
 *     removeDrawing: Removes a drawing by ID.
 *     setCandleFilterMinute: Setter for candle filter minute.
 *     setRenderAfterFilterMinute: Setter for render-after-filter flag.
 *     setIsPickingCandleFilter: Setter for candle filter picking state.
 *     toggleDrawMode: Toggles draw mode on/off.
 *     exitFullscreenRef: Ref with function to exit fullscreen.
 *
 * Returns:
 *     Cleanup function that removes all registered window event listeners.
 */
export function bindTradingChartWindowEvents({
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
}: TradingChartWindowDeps): () => void {
    resizeCanvas()
    resizeCanvas()

    const cleanupKeyboard = createKeyboardShortcuts({
        chartCanvasRef,
        yAxisCanvasRef,
        xAxisCanvasRef,
        runtimeRef,
        removeDrawing,
        setSelectedDrawingId,
        cancelFibPlacement,
        cancelEntryPlacement,
        setIsPickingCandleFilter,
        drawCanvas,
        exitFullscreenRef,
        toggleDrawMode,
    })

    const cleanupWindow = createWindowEvents({
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
    })

    return () => {
        cleanupKeyboard()
        cleanupWindow()
    }
}
