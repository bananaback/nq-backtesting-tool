import { useRef } from 'react'
import type { RefObject } from 'react'
import type { ChartRuntimeState, Timeframe } from '../types/chart'
import { createEmptyChartData } from '../types/chart'

export function useChartRuntime(): {
    runtimeRef: RefObject<ChartRuntimeState>
    currentTfRef: RefObject<Timeframe>
    drawModeRef: RefObject<boolean>
    showDaySeparatorsRef: RefObject<boolean>
    drawMenuOpenRef: RefObject<boolean>
    exitFullscreenRef: RefObject<(() => void) | null>
    onHideTopBarRef: RefObject<(() => void) | null>
} {
    const runtimeRef = useRef<ChartRuntimeState>({
        chartData: createEmptyChartData(),
        sourceFiles: {},
        showDaySeparators: true,
        drawings: [],
        drawingIdCounter: 1,
        viewStart: 0,
        visibleCount: 100,
        isAutoScaled: true,
        manualMaxP: 0,
        manualMinP: 0,
        crosshairActive: false,
        crosshairX: 0,
        crosshairY: 0,
        selectedCandleIndex: null,
        selectedDrawingId: null,
        mouseDownX: 0,
        mouseDownY: 0,
        isDraggingChart: false,
        isDraggingAxis: false,
        lastX: 0,
        lastY: 0,
        pendingFibPlacement: null,
        pendingEntryPlacement: null,
        pendingCandleFilterPick: false,
        candleFilterMinute: '',
        renderAfterFilterMinute: true,
    })

    const currentTfRef = useRef<Timeframe>('m1')
    const drawModeRef = useRef(false)
    const drawMenuOpenRef = useRef(false)
    const showDaySeparatorsRef = useRef(true)
    const exitFullscreenRef = useRef<(() => void) | null>(null)
    const onHideTopBarRef = useRef<(() => void) | null>(null)

    return {
        runtimeRef,
        currentTfRef,
        drawModeRef,
        showDaySeparatorsRef,
        drawMenuOpenRef,
        exitFullscreenRef,
        onHideTopBarRef,
    }
}
