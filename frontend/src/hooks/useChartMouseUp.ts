import type { RefObject, Dispatch, SetStateAction } from 'react'
import type { Timeframe } from '../types/chart'
import type { ChartRuntimeState, DrawMenuState } from '../types/state'
import { snapPriceToCandleOHLC } from '../utils/drawing'
import { getTimeframeMinutes } from '../utils/time'
import { handleFibPlacement } from './useChartMouseUpFib'
import { handleEntryPlacement } from './useChartMouseUpEntry'
import { hitTestDrawings } from './useChartHitTest'

export type MouseUpDeps = {
    chartCanvasRef: RefObject<HTMLCanvasElement | null>
    runtimeRef: RefObject<ChartRuntimeState>
    currentTfRef: RefObject<Timeframe>
    drawModeRef: RefObject<boolean>
    drawMenuOpenRef: RefObject<boolean>
    setDrawMenu: Dispatch<SetStateAction<DrawMenuState>>
    setDrawings: Dispatch<SetStateAction<ChartRuntimeState['drawings']>>
    setSelectedDrawingId: Dispatch<SetStateAction<number | null>>
    setFibPlacementStep: Dispatch<SetStateAction<'pick-first' | 'pick-second' | null>>
    cancelFibPlacement: () => void
    setEntryPlacementStep: Dispatch<SetStateAction<'pick-entry' | 'pick-sl' | 'pick-tp' | 'pick-width' | null>>
    cancelEntryPlacement: () => void
    setCandleFilterMinute: Dispatch<SetStateAction<string>>
    setRenderAfterFilterMinute: Dispatch<SetStateAction<boolean>>
    setIsPickingCandleFilter: Dispatch<SetStateAction<boolean>>
    toggleDrawMode: () => void
    drawCanvas: () => void
}

/** Handle mouseup for drawing placement, hit-test/drag, entry/fib placement state machine. */
export function handleChartMouseUp(
    event: globalThis.MouseEvent,
    deps: MouseUpDeps,
): void {
    const {
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
    } = deps

    const runtime = runtimeRef.current
    const chartCanvas = chartCanvasRef.current
    const dx = event.clientX - runtime.mouseDownX
    const dy = event.clientY - runtime.mouseDownY
    const data = runtime.chartData[currentTfRef.current]

    // Candle filter pick
    if (runtime.pendingCandleFilterPick && Math.abs(dx) < 3 && Math.abs(dy) < 3 && chartCanvas) {
        const chartRect = chartCanvas.getBoundingClientRect()
        const candleSpace = chartCanvas.width / Math.max(1, runtime.visibleCount)
        const hoverIndex = Math.floor(runtime.viewStart + (event.clientX - chartRect.left) / candleSpace)

        if (hoverIndex >= 0 && hoverIndex < data.length) {
            const rawTime = data[hoverIndex].time
            const normalized = rawTime.includes(' ') ? rawTime.replace(' ', 'T') : rawTime
            const parsed = new Date(normalized)
            const minuteValue = Number.isNaN(parsed.getTime())
                ? normalized.slice(0, 16)
                : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}T${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`

            runtime.candleFilterMinute = minuteValue
            runtime.renderAfterFilterMinute = false
            runtime.pendingCandleFilterPick = false
            setCandleFilterMinute(minuteValue)
            setRenderAfterFilterMinute(false)
            setIsPickingCandleFilter(false)
            drawCanvas()
            return
        }
    }

    // Draw mode: compute shared geometry
    if (drawModeRef.current && Math.abs(dx) < 3 && Math.abs(dy) < 3 && chartCanvas) {
        const chartRect = chartCanvas.getBoundingClientRect()
        const candleSpace = chartCanvas.width / Math.max(1, runtime.visibleCount)
        const hoverIndex = Math.floor(runtime.viewStart + (event.clientX - chartRect.left) / candleSpace)

        if (hoverIndex >= 0 && hoverIndex < data.length) {
            // Find the last visible candle index (at or before replay cutoff)
            let lastVisibleIndex = data.length - 1
            if (runtime.candleFilterMinute && !runtime.renderAfterFilterMinute) {
                const normalized = runtime.candleFilterMinute.includes(' ')
                    ? runtime.candleFilterMinute.replace(' ', 'T')
                    : runtime.candleFilterMinute
                const cutoffEpoch = new Date(normalized).getTime()
                for (let i = data.length - 1; i >= 0; i--) {
                    const candleTime = data[i].time.includes(' ') ? data[i].time.replace(' ', 'T') : data[i].time
                    const candleEpoch = new Date(candleTime).getTime()
                    if (candleEpoch <= cutoffEpoch) {
                        lastVisibleIndex = i
                        break
                    }
                }
            }
            const clampedIndex = Math.min(hoverIndex, lastVisibleIndex)
            const candle = data[clampedIndex]
            const priceRange = runtime.manualMaxP - runtime.manualMinP || 1
            const cursorPrice = runtime.manualMaxP - ((event.clientY - chartRect.top) / chartCanvas.height) * priceRange
            const snappedPrice = snapPriceToCandleOHLC(candle, cursorPrice)

            // Fib placement state machine
            if (runtime.pendingFibPlacement) {
                if (handleFibPlacement(
                    runtime, chartCanvas, candleSpace, data, clampedIndex,
                    cursorPrice, snappedPrice,
                    setFibPlacementStep, setDrawings, toggleDrawMode, drawCanvas,
                )) return
            }

            // Entry placement state machine
            if (runtime.pendingEntryPlacement) {
                if (handleEntryPlacement(
                    runtime, candleSpace, data, clampedIndex,
                    cursorPrice, snappedPrice, currentTfRef.current,
                    runtime.candleFilterMinute,
                    setEntryPlacementStep, setDrawings, toggleDrawMode, drawCanvas,
                )) return
            }

            // Open draw menu
            runtime.selectedCandleIndex = hoverIndex
            drawMenuOpenRef.current = true
            setDrawMenu({ x: event.clientX - chartRect.left, y: event.clientY - chartRect.top })
        }
    }

    // Draw mode: open menu (no pending placement)
    if (drawModeRef.current && Math.abs(dx) < 3 && Math.abs(dy) < 3 && !drawMenuOpenRef.current && chartCanvas) {
        const chartRect = chartCanvas.getBoundingClientRect()
        const candleSpace = chartCanvas.width / Math.max(1, runtime.visibleCount)
        const hoverIndex = Math.floor(runtime.viewStart + (event.clientX - chartRect.left) / candleSpace)

        if (hoverIndex >= 0 && hoverIndex < data.length) {
            runtime.selectedCandleIndex = hoverIndex
            drawMenuOpenRef.current = true
            setDrawMenu({ x: event.clientX - chartRect.left, y: event.clientY - chartRect.top })
        }
    }

    // Selection: when not in draw mode, a click near an annotation selects it
    if (!drawModeRef.current && Math.abs(dx) < 6 && Math.abs(dy) < 6 && chartCanvas) {
        const chartRect = chartCanvas.getBoundingClientRect()
        const candleSpace = chartCanvas.width / Math.max(1, runtime.visibleCount)
        const cursorX = event.clientX - chartRect.left
        const cursorY = event.clientY - chartRect.top

        const priceRange = runtime.manualMaxP - runtime.manualMinP || 1
        const getY = (price: number) => chartCanvas.height - ((price - runtime.manualMinP) / priceRange) * chartCanvas.height
        const currentTfMinutes = getTimeframeMinutes(currentTfRef.current)

        const bestId = hitTestDrawings(
            runtime, chartCanvas, cursorX, cursorY, candleSpace, getY, currentTfMinutes, data,
        )

        runtime.selectedDrawingId = bestId
        setSelectedDrawingId(bestId)
    }

    runtime.isDraggingChart = false
    runtime.isDraggingAxis = false
    if (chartCanvas) chartCanvas.style.cursor = 'crosshair'
    drawCanvas()
}
