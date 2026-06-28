import type { RefObject, WheelEvent as ReactWheelEvent } from 'react'
import type { Timeframe } from '../types/chart'
import type { ChartRuntimeState } from '../types/state'
import { clamp } from '../utils/math'

type ChartZoomDeps = {
    chartCanvasRef: RefObject<HTMLCanvasElement | null>
    runtimeRef: RefObject<ChartRuntimeState>
    currentTfRef: RefObject<Timeframe>
    drawMenuOpenRef: RefObject<boolean>
    drawCanvas: () => void
}

export function createChartZoom({
    chartCanvasRef,
    runtimeRef,
    currentTfRef,
    drawMenuOpenRef,
    drawCanvas,
}: ChartZoomDeps) {
    const handleChartWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
        event.preventDefault()
        if (drawMenuOpenRef.current) return

        const chartCanvas = chartCanvasRef.current
        if (!chartCanvas) return

        const runtime = runtimeRef.current
        const data = runtime.chartData[currentTfRef.current]
        if (!data.length) return

        const zoomFactor = event.nativeEvent.deltaY > 0 ? 1.1 : 0.9
        const ratio = event.nativeEvent.offsetX / chartCanvas.width
        const indexAtMouse = runtime.viewStart + runtime.visibleCount * ratio

        runtime.visibleCount *= zoomFactor
        runtime.visibleCount = clamp(runtime.visibleCount, 10, Math.max(data.length * 2, 10))
        runtime.viewStart = indexAtMouse - runtime.visibleCount * ratio
        drawCanvas()
    }

    const handleYAxisDoubleClick = () => {
        runtimeRef.current.isAutoScaled = true
        drawCanvas()
    }

    const handleYAxisWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
        event.preventDefault()
        if (drawMenuOpenRef.current) return

        const runtime = runtimeRef.current
        const data = runtime.chartData[currentTfRef.current]
        if (!data.length) return

        runtime.isAutoScaled = false
        const scaleFactor = 1 + event.nativeEvent.deltaY * 0.001
        const center = (runtime.manualMaxP + runtime.manualMinP) / 2

        runtime.manualMaxP = center + (runtime.manualMaxP - center) * scaleFactor
        runtime.manualMinP = center - (center - runtime.manualMinP) * scaleFactor
        drawCanvas()
    }

    return { handleChartWheel, handleYAxisDoubleClick, handleYAxisWheel }
}
