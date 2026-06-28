import { useRef } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { ChartRuntimeState, OhlcState, Timeframe } from '../types/chart'
import { drawTradingChart } from '../engine/renderer'
import { resizeTradingChart } from '../engine/resize'

export function useChartEngine() {
    const chartCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const yAxisCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const xAxisCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const chartStageRef = useRef<HTMLDivElement | null>(null)

    const drawCanvas = (
        runtimeRef: RefObject<ChartRuntimeState>,
        currentTfRef: RefObject<Timeframe>,
        drawMenuOpenRef: RefObject<boolean>,
        setOhlc: Dispatch<SetStateAction<OhlcState>>,
    ) => {
        const chartCanvas = chartCanvasRef.current
        const yAxisCanvas = yAxisCanvasRef.current
        const xAxisCanvas = xAxisCanvasRef.current
        if (!chartCanvas || !yAxisCanvas || !xAxisCanvas) return

        drawTradingChart({
            chartCanvas,
            yAxisCanvas,
            xAxisCanvas,
            runtime: runtimeRef.current,
            currentTF: currentTfRef.current,
            drawMenuOpen: drawMenuOpenRef.current,
            setOhlc,
        })
    }

    const resizeCanvas = (
        runtimeRef: RefObject<ChartRuntimeState>,
        currentTfRef: RefObject<Timeframe>,
        drawMenuOpenRef: RefObject<boolean>,
        setOhlc: Dispatch<SetStateAction<OhlcState>>,
    ) => {
        const chartCanvas = chartCanvasRef.current
        const yAxisCanvas = yAxisCanvasRef.current
        const xAxisCanvas = xAxisCanvasRef.current
        const chartStage = chartStageRef.current
        if (!chartCanvas || !yAxisCanvas || !xAxisCanvas || !chartStage) return

        resizeTradingChart({
            chartCanvas,
            yAxisCanvas,
            xAxisCanvas,
            chartStage,
            drawChart: () => drawCanvas(runtimeRef, currentTfRef, drawMenuOpenRef, setOhlc),
        })
    }

    return {
        chartCanvasRef,
        yAxisCanvasRef,
        xAxisCanvasRef,
        chartStageRef,
        drawCanvas,
        resizeCanvas,
    }
}
