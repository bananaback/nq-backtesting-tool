import type { Dispatch, SetStateAction } from 'react'
import type { ChartRuntimeState, OhlcState } from '../types/state'
import { formatAxisTime } from '../utils/time'

type DrawCrosshairArgs = {
    chartCanvas: HTMLCanvasElement
    yAxisCanvas: HTMLCanvasElement
    xAxisCanvas: HTMLCanvasElement
    runtime: ChartRuntimeState
    visibleData: ChartRuntimeState['chartData'][keyof ChartRuntimeState['chartData']]
    candleSpace: number
    priceRange: number
    drawMenuOpen: boolean
    setOhlc: Dispatch<SetStateAction<OhlcState>>
}

export function drawCrosshairOverlay({
    chartCanvas,
    yAxisCanvas,
    xAxisCanvas,
    runtime,
    visibleData,
    candleSpace,
    priceRange,
    drawMenuOpen,
    setOhlc,
}: DrawCrosshairArgs) {
    const ctx = chartCanvas.getContext('2d')
    const yCtx = yAxisCanvas.getContext('2d')
    const xCtx = xAxisCanvas.getContext('2d')
    if (!ctx || !yCtx || !xCtx || !visibleData.length) return false

    if (!runtime.crosshairActive || runtime.isDraggingChart || drawMenuOpen) {
        setOhlc({ visible: false })
        return false
    }

    const snappedX = Math.max(0.5, Math.min(chartCanvas.width - 0.5, Math.round(runtime.crosshairX) + 0.5))
    const snappedY = Math.max(0.5, Math.min(chartCanvas.height - 0.5, Math.round(runtime.crosshairY) + 0.5))
    const startIdx = Math.floor(Math.max(0, runtime.viewStart))
    const hoverDataIndex = Math.round((snappedX - candleSpace / 2) / candleSpace + runtime.viewStart)
    const hoverIndex = hoverDataIndex - startIdx

    if (hoverIndex < 0 || hoverIndex >= visibleData.length) {
        setOhlc({ visible: false })
        return false
    }

    const candle = visibleData[hoverIndex]
    const candleCenterX = Math.max(0.5, Math.min(chartCanvas.width - 0.5, (hoverDataIndex - runtime.viewStart) * candleSpace + candleSpace / 2))
    ctx.beginPath()
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = '#9ca3af'
    ctx.moveTo(candleCenterX, 0)
    ctx.lineTo(candleCenterX, chartCanvas.height)
    ctx.moveTo(0, snappedY)
    ctx.lineTo(chartCanvas.width, snappedY)
    ctx.stroke()
    ctx.setLineDash([])

    const priceAtMouse = runtime.manualMaxP - (snappedY / chartCanvas.height) * priceRange
    yCtx.fillStyle = '#1f2937'
    yCtx.fillRect(0, snappedY - 10, yAxisCanvas.width, 20)
    yCtx.fillStyle = '#ffffff'
    yCtx.fillText(priceAtMouse.toFixed(2), 10, snappedY)

    const timeStr = formatAxisTime(candle.time)
    const textWidth = xCtx.measureText(timeStr).width
    xCtx.fillStyle = '#1f2937'
    xCtx.fillRect(candleCenterX - textWidth / 2 - 8, 0, textWidth + 16, xAxisCanvas.width)
    xCtx.fillStyle = '#ffffff'
    xCtx.fillText(timeStr, candleCenterX, xAxisCanvas.height / 2)

    setOhlc({
        visible: true,
        time: candle.time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        bullish: candle.close > candle.open,
    })
    return true
}
