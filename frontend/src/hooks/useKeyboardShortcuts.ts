import type { RefObject, Dispatch, SetStateAction } from 'react'
import type { ChartRuntimeState } from '../types/state'
import { captureChartToImage } from '../engine/capture'

type KeyboardShortcutsDeps = {
    chartCanvasRef: RefObject<HTMLCanvasElement | null>
    yAxisCanvasRef: RefObject<HTMLCanvasElement | null>
    xAxisCanvasRef: RefObject<HTMLCanvasElement | null>
    runtimeRef: RefObject<ChartRuntimeState>
    removeDrawing: (id: number) => void
    setSelectedDrawingId: Dispatch<SetStateAction<number | null>>
    cancelFibPlacement: () => void
    cancelEntryPlacement: () => void
    setIsPickingCandleFilter: Dispatch<SetStateAction<boolean>>
    drawCanvas: () => void
    exitFullscreenRef: RefObject<(() => void) | null>
    toggleDrawMode: () => void
}

export function createKeyboardShortcuts({
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
}: KeyboardShortcutsDeps): () => void {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
        const activeElement = document.activeElement as HTMLElement | null
        if (activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)) return

        if ((event.key === 'Backspace' || event.key === 'Delete') && runtimeRef.current.selectedDrawingId !== null) {
            event.preventDefault()
            removeDrawing(runtimeRef.current.selectedDrawingId)
            setSelectedDrawingId(null)
        }

        if (event.key === 'Escape') {
            event.preventDefault()
            let escapeHandled = false

            if (runtimeRef.current.pendingFibPlacement) {
                cancelFibPlacement()
                escapeHandled = true
            }

            if (runtimeRef.current.pendingEntryPlacement) {
                cancelEntryPlacement()
                escapeHandled = true
            }

            if (runtimeRef.current.pendingCandleFilterPick) {
                runtimeRef.current.pendingCandleFilterPick = false
                setIsPickingCandleFilter(false)
                drawCanvas()
                escapeHandled = true
            }

            if (!escapeHandled) {
                exitFullscreenRef.current?.()
            }
        }

        if ((event.key === 'd' || event.key === 'D') && !event.ctrlKey && !event.altKey && !event.metaKey) {
            event.preventDefault()
            toggleDrawMode()
        }

        if ((event.key === 'p' || event.key === 'P') && !event.ctrlKey && !event.altKey && !event.metaKey) {
            event.preventDefault()
            const chartCanvas = chartCanvasRef.current
            const yAxisCanvas = yAxisCanvasRef.current
            const xAxisCanvas = xAxisCanvasRef.current
            if (chartCanvas && yAxisCanvas && xAxisCanvas) {
                captureChartToImage(chartCanvas, yAxisCanvas, xAxisCanvas, runtimeRef)
            }
        }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
        window.removeEventListener('keydown', handleKeyDown)
    }
}
