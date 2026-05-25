import type { RefObject, Dispatch, SetStateAction } from 'react'
import type { ChartRuntimeState, DrawMenuState, Timeframe } from '../chartTypes'

type TradingChartWindowDeps = {
    chartCanvasRef: RefObject<HTMLCanvasElement | null>
    runtimeRef: RefObject<ChartRuntimeState>
    currentTfRef: RefObject<Timeframe>
    drawModeRef: RefObject<boolean>
    drawMenuOpenRef: RefObject<boolean>
    setDrawMenu: Dispatch<SetStateAction<DrawMenuState>>
    drawCanvas: () => void
    resizeCanvas: () => void
}

export function bindTradingChartWindowEvents({
    chartCanvasRef,
    runtimeRef,
    currentTfRef,
    drawModeRef,
    drawMenuOpenRef,
    setDrawMenu,
    drawCanvas,
    resizeCanvas,
}: TradingChartWindowDeps) {
    resizeCanvas()

    const handleResize = () => resizeCanvas()
    const handleMouseMove = (event: globalThis.MouseEvent) => {
        const chartCanvas = chartCanvasRef.current
        if (!chartCanvas) return

        const runtime = runtimeRef.current
        const chartRect = chartCanvas.getBoundingClientRect()
        runtime.crosshairActive = event.clientX >= chartRect.left && event.clientX <= chartRect.right && event.clientY >= chartRect.top && event.clientY <= chartRect.bottom
        if (runtime.crosshairActive) {
            runtime.crosshairX = event.clientX - chartRect.left
            runtime.crosshairY = event.clientY - chartRect.top
        }

        const data = runtime.chartData[currentTfRef.current]
        if (runtime.isDraggingChart && data.length) {
            const dx = event.clientX - runtime.lastX
            const dy = event.clientY - runtime.lastY
            const candleSpace = chartCanvas.width / Math.max(1, runtime.visibleCount)

            runtime.viewStart -= dx / candleSpace
            const pricePerPixel = (runtime.manualMaxP - runtime.manualMinP) / chartCanvas.height
            runtime.manualMaxP += dy * pricePerPixel
            runtime.manualMinP += dy * pricePerPixel
            runtime.isAutoScaled = false

            if (runtime.viewStart < -runtime.visibleCount / 2) runtime.viewStart = -runtime.visibleCount / 2
            if (runtime.viewStart > data.length - runtime.visibleCount / 2) runtime.viewStart = data.length - runtime.visibleCount / 2

            runtime.lastX = event.clientX
            runtime.lastY = event.clientY
        }

        if (runtime.isDraggingAxis && data.length) {
            runtime.isAutoScaled = false
            const dy = event.clientY - runtime.lastY
            const scaleFactor = 1 + dy * 0.01
            const center = (runtime.manualMaxP + runtime.manualMinP) / 2

            runtime.manualMaxP = center + (runtime.manualMaxP - center) * scaleFactor
            runtime.manualMinP = center - (center - runtime.manualMinP) * scaleFactor
            runtime.lastY = event.clientY
        }

        if (data.length) drawCanvas()
    }

    const handleMouseUp = (event: globalThis.MouseEvent) => {
        const runtime = runtimeRef.current
        const chartCanvas = chartCanvasRef.current
        const dx = event.clientX - runtime.mouseDownX
        const dy = event.clientY - runtime.mouseDownY

        if (drawModeRef.current && Math.abs(dx) < 3 && Math.abs(dy) < 3 && !drawMenuOpenRef.current && chartCanvas) {
            const data = runtime.chartData[currentTfRef.current]
            const chartRect = chartCanvas.getBoundingClientRect()
            const candleSpace = chartCanvas.width / Math.max(1, runtime.visibleCount)
            const hoverIndex = Math.floor(runtime.viewStart + (event.clientX - chartRect.left) / candleSpace)

            if (hoverIndex >= 0 && hoverIndex < data.length) {
                runtime.selectedCandleIndex = hoverIndex
                drawMenuOpenRef.current = true
                setDrawMenu({ x: event.clientX - chartRect.left, y: event.clientY - chartRect.top })
            }
        }

        runtime.isDraggingChart = false
        runtime.isDraggingAxis = false
        if (chartCanvas) chartCanvas.style.cursor = 'crosshair'
        drawCanvas()
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
