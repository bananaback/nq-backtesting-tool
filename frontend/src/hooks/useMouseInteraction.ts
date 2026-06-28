import type { RefObject, MouseEvent as ReactMouseEvent } from 'react'
import type { ChartRuntimeState } from '../types/state'

type MouseInteractionDeps = {
    chartCanvasRef: RefObject<HTMLCanvasElement | null>
    runtimeRef: RefObject<ChartRuntimeState>
    drawMenuOpenRef: RefObject<boolean>
    drawCanvas: () => void
}

export function createMouseInteraction({
    chartCanvasRef,
    runtimeRef,
    drawMenuOpenRef,
    drawCanvas,
}: MouseInteractionDeps) {
    const handleChartMouseDown = (event: ReactMouseEvent<HTMLCanvasElement>) => {
        const runtime = runtimeRef.current
        runtime.mouseDownX = event.clientX
        runtime.mouseDownY = event.clientY

        if (!drawMenuOpenRef.current && !runtime.pendingFibPlacement && !runtime.pendingEntryPlacement) {
            runtime.isDraggingChart = true
            runtime.lastX = event.clientX
            runtime.lastY = event.clientY
            if (chartCanvasRef.current) chartCanvasRef.current.style.cursor = 'grabbing'
            drawCanvas()
        }
    }

    const handleChartMouseLeave = () => {
        runtimeRef.current.crosshairActive = false
        if (!runtimeRef.current.isDraggingChart) drawCanvas()
    }

    const handleYAxisMouseDown = (event: ReactMouseEvent<HTMLCanvasElement>) => {
        runtimeRef.current.isDraggingAxis = true
        runtimeRef.current.lastY = event.clientY
    }

    return { handleChartMouseDown, handleChartMouseLeave, handleYAxisMouseDown }
}
