import type { Dispatch, SetStateAction } from 'react'
import type { ChartRuntimeState, OhlcState, Timeframe } from './chartTypes'
import { getIndexByTime } from './chartUtils'
import { drawCrosshairOverlay } from './chartCrosshair'

type DrawTradingChartArgs = {
    chartCanvas: HTMLCanvasElement
    yAxisCanvas: HTMLCanvasElement
    xAxisCanvas: HTMLCanvasElement
    runtime: ChartRuntimeState
    currentTF: Timeframe
    drawMenuOpen: boolean
    setOhlc: Dispatch<SetStateAction<OhlcState>>
}

export function drawTradingChart({
    chartCanvas,
    yAxisCanvas,
    xAxisCanvas,
    runtime,
    currentTF,
    drawMenuOpen,
    setOhlc,
}: DrawTradingChartArgs) {
    const ctx = chartCanvas.getContext('2d')
    const yCtx = yAxisCanvas.getContext('2d')
    const xCtx = xAxisCanvas.getContext('2d')
    if (!ctx || !yCtx || !xCtx) return

    const data = runtime.chartData[currentTF]
    ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height)
    yCtx.clearRect(0, 0, yAxisCanvas.width, yAxisCanvas.height)
    xCtx.clearRect(0, 0, xAxisCanvas.width, xAxisCanvas.height)

    if (!data.length) {
        setOhlc({ visible: false })
        return
    }

    const startIdx = Math.floor(Math.max(0, runtime.viewStart))
    const endIdx = Math.ceil(Math.min(data.length - 1, runtime.viewStart + runtime.visibleCount))
    const visibleData = data.slice(startIdx, endIdx + 1)
    if (!visibleData.length) {
        setOhlc({ visible: false })
        return
    }

    let currentMax = -Infinity
    let currentMin = Infinity
    visibleData.forEach((item) => {
        if (item.high > currentMax) currentMax = item.high
        if (item.low < currentMin) currentMin = item.low
    })

    let range = currentMax - currentMin
    if (range === 0) range = 1
    if (runtime.isAutoScaled) {
        runtime.manualMaxP = currentMax + range * 0.05
        runtime.manualMinP = currentMin - range * 0.05
    }

    const priceRange = runtime.manualMaxP - runtime.manualMinP || 1
    const candleSpace = chartCanvas.width / Math.max(1, runtime.visibleCount)
    const candleWidth = Math.max(1, candleSpace * 0.7)
    const getY = (price: number) => chartCanvas.height - ((price - runtime.manualMinP) / priceRange) * chartCanvas.height

    runtime.drawings.forEach((tool) => {
        const index = getIndexByTime(data, tool.time)
        if (index === -1) return

        const x = (index - runtime.viewStart) * candleSpace + candleSpace / 2
        if (x > chartCanvas.width) return

        if (tool.type === 'FVG') {
            const yTop = getY(tool.top)
            const yBot = getY(tool.bot)
            const height = Math.abs(yBot - yTop)
            const yDraw = Math.min(yTop, yBot)
            ctx.fillStyle = tool.color
            ctx.fillRect(x, yDraw, chartCanvas.width - x, height)
            ctx.strokeStyle = tool.border
            ctx.lineWidth = 1
            ctx.strokeRect(x, yDraw, chartCanvas.width - x, height)
            return
        }

        const y = getY(tool.price)
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(chartCanvas.width, y)
        ctx.strokeStyle = tool.color
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.fillStyle = tool.color
        ctx.font = 'bold 10px sans-serif'
        ctx.fillText(tool.type, x + 4, y - 4)
    })

    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1
    xCtx.fillStyle = '#6b7280'
    xCtx.font = '11px sans-serif'
    xCtx.textAlign = 'center'
    xCtx.textBaseline = 'middle'

    let lastDrawnTimeX = -100
    for (let i = startIdx; i <= endIdx; i += 1) {
        const candle = data[i]
        const x = (i - runtime.viewStart) * candleSpace + candleSpace / 2
        const xLine = Math.floor(x) + 0.5

        if (x - lastDrawnTimeX > 100) {
            xCtx.fillText(candle.time.length >= 16 ? candle.time.substring(5, 16) : candle.time, xLine, xAxisCanvas.height / 2)
            lastDrawnTimeX = xLine
        }

        const yO = getY(candle.open)
        const yC = getY(candle.close)
        const yH = getY(candle.high)
        const yL = getY(candle.low)

        ctx.beginPath()
        ctx.moveTo(xLine, Math.floor(yH) + 0.5)
        ctx.lineTo(xLine, Math.floor(yL) + 0.5)
        ctx.strokeStyle = '#000000'
        ctx.stroke()

        const bullish = candle.close > candle.open
        ctx.fillStyle = bullish ? '#22c55e' : '#000000'
        const top = Math.floor(Math.min(yO, yC)) + 0.5
        const bottom = Math.floor(Math.max(yO, yC)) + 0.5
        const height = Math.max(1, bottom - top)
        const width = Math.floor(candleWidth)
        const xBody = Math.floor(x - width / 2) + 0.5
        ctx.fillRect(xBody, top, width, height)
        ctx.strokeRect(xBody, top, width, height)
    }

    yCtx.fillStyle = '#6b7280'
    yCtx.font = '11px sans-serif'
    yCtx.textBaseline = 'middle'
    for (let i = 1; i <= 5; i += 1) {
        const y = (yAxisCanvas.height / 6) * i
        yCtx.fillText((runtime.manualMaxP - (priceRange / 6) * i).toFixed(2), 10, y)
    }

    drawCrosshairOverlay({
        chartCanvas,
        yAxisCanvas,
        xAxisCanvas,
        runtime,
        visibleData,
        candleSpace,
        priceRange,
        drawMenuOpen,
        setOhlc,
    })
}