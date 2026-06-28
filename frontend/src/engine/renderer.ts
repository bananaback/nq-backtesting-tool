import type { Dispatch, SetStateAction } from 'react'
import type { ChartRuntimeState, EntryDrawing, EntryStatus, OhlcState, Timeframe } from '../types/chart'
import { getDrawingLengthMinutes, getFibLevelPrice, getFibLineDash } from '../utils/drawing'
import { getIndexByTime, getTimeframeMinutes } from '../utils/time'
import { drawCandles, computeCandleFilter } from './drawCandles'
import { drawCrosshairOverlay } from './crosshair'
import { drawFibDrawing, drawPendingFib, type FibRenderDrawing } from './drawFib'
import { drawEntryZones, drawEntryAxisTabs, renderEntry, drawPendingEntry } from './drawEntry'
import { drawDaySeparators } from './drawDaySeparators'
import { drawNewsMarkers } from './drawNews'
import { drawVline } from './drawVlines'
import { drawFvg, drawOb, drawOrg } from './drawFvgOb'
import { drawLineTool } from './drawLines'

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
    const ctx = chartCanvas.getContext('2d', { alpha: false })
    const yCtx = yAxisCanvas.getContext('2d')
    const xCtx = xAxisCanvas.getContext('2d')
    if (!ctx || !yCtx || !xCtx) return

    const data = runtime.chartData[currentTF]
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, chartCanvas.width, chartCanvas.height)
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
    const timeframeMinutes = getTimeframeMinutes(currentTF)
    const getY = (price: number) => chartCanvas.height - ((price - runtime.manualMinP) / priceRange) * chartCanvas.height
    const { candleFilterLastIndex, shouldRenderCandle } = computeCandleFilter(runtime, data)

    if (runtime.showDaySeparators) {
        drawDaySeparators(ctx, xCtx, chartCanvas, xAxisCanvas, runtime, data, candleSpace, startIdx, endIdx)
    }

    // Native news rendering — always on when showNews is enabled
    if (runtime.showNews && runtime.newsData.length > 0) {
        drawNewsMarkers(ctx, chartCanvas, runtime, data, candleSpace, startIdx, endIdx)
    }

    const entryDrawingsRender: Array<{
        entryY: number
        slY: number
        tpY: number
        entryPrice: number
        slPrice: number
        tpPrice: number
        isLong: boolean
        isSelected: boolean
        status: EntryStatus
        widthEndX: number
    }> = []

    runtime.drawings.forEach((tool) => {
        const index = getIndexByTime(data, tool.time)
        if (index === -1) return

        const x = (index - runtime.viewStart) * candleSpace + candleSpace / 2

        const isSelected = runtime.selectedDrawingId === tool.id
        if (tool.type === 'VLINE') {
            drawVline(ctx, chartCanvas, runtime, x, tool.color, isSelected)
            return
        }

        if (tool.type === 'FIB') {
            drawFibDrawing(ctx, chartCanvas, runtime, data, candleSpace, getY, tool as unknown as FibRenderDrawing, isSelected)
            return
        }

        if (tool.type === 'FVG') {
            drawFvg(ctx, chartCanvas, candleSpace, timeframeMinutes, getY, tool, x, isSelected)
            return
        }

        if (tool.type === 'ORG' || tool.type === 'NDOG' || tool.type === 'NWOG') {
            drawOrg(ctx, chartCanvas, candleSpace, timeframeMinutes, getY, tool, x, isSelected)
            return
        }

        if (tool.type === 'ENTRY') {
            const entryData = renderEntry(ctx, chartCanvas, runtime, data, candleSpace, timeframeMinutes, getY, tool as EntryDrawing, x, index, isSelected, shouldRenderCandle)
            if (entryData) entryDrawingsRender.push(entryData)
            return
        }

        if (tool.type === 'OB') {
            drawOb(ctx, candleSpace, timeframeMinutes, getY, tool, x, isSelected)
            return
        }

        if ('price' in tool) {
            drawLineTool(ctx, chartCanvas, runtime, data, candleSpace, timeframeMinutes, endIdx, getY, tool, x, index, isSelected)
        }
    })

    if (runtime.pendingFibPlacement && !drawMenuOpen) {
        drawPendingFib(ctx, chartCanvas, runtime, data, candleSpace, priceRange, getY)
    }

    if (runtime.pendingEntryPlacement && !drawMenuOpen) {
        drawPendingEntry(ctx, chartCanvas, runtime, data, candleSpace, priceRange, candleFilterLastIndex, getY, !!runtime.pendingFibPlacement)
    }

    if (runtime.pendingCandleFilterPick && !drawMenuOpen) {
        ctx.save()
        ctx.setLineDash([])
        ctx.font = 'bold 11px sans-serif'
        ctx.fillStyle = '#0f172a'
        ctx.fillText('Candle Filter: click a candle to set cutoff time', 12, (runtime.pendingFibPlacement || runtime.pendingEntryPlacement) ? 36 : 18)
        ctx.restore()
    }

    drawCandles(ctx, xCtx, xAxisCanvas, runtime, data, candleSpace, candleWidth, startIdx, endIdx, getY, shouldRenderCandle)

    yCtx.fillStyle = '#6b7280'
    yCtx.font = '11px sans-serif'
    yCtx.textBaseline = 'middle'
    for (let i = 1; i <= 5; i += 1) {
        const y = (yAxisCanvas.height / 6) * i
        yCtx.fillText((runtime.manualMaxP - (priceRange / 6) * i).toFixed(2), 10, y)
    }

    // Draw entry y-axis tabs
    entryDrawingsRender.forEach((entry) => {
        drawEntryAxisTabs(
            yCtx,
            yAxisCanvas,
            entry.entryY,
            entry.slY,
            entry.tpY,
            entry.entryPrice,
            entry.slPrice,
            entry.tpPrice,
            entry.isLong,
            entry.isSelected,
            entry.status,
        )
    })

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
