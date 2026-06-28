import { createCanvas } from 'canvas'
import { Candle, Drawing, findTimeByDayAndClock, getIndexByTime } from './candleUtils'
import { renderDrawings } from './renderDrawings'

/** Render chart to canvas (exact replica of drawTradingChart with 3 canvases) */
export function renderChart(allCandles: Candle[], drawings: Drawing[], date: string): Buffer {
  // Find 6:30 and 11:30 candles
  const startCandle = findTimeByDayAndClock(allCandles, date, '06:30')
  const endCandle = findTimeByDayAndClock(allCandles, date, '11:30')
  if (!startCandle || !endCandle) {
    throw new Error(`No 6:30-11:30 candles for ${date}`)
  }

  const startIdx = getIndexByTime(allCandles, startCandle.time)
  const endIdx = getIndexByTime(allCandles, endCandle.time)
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Could not locate 6:30-11:30 for ${date}`)
  }

  // Calculate visibleCount to show 6:30-11:30 (300 minutes)
  const visibleCount = endIdx - startIdx + 1

  // Set viewStart to center on 6:30
  const viewStart = Math.max(0, startIdx - 5)

  // Calculate high/low of 6:30-11:30 range for Y scale
  let rangeHigh = -Infinity
  let rangeLow = Infinity
  for (let i = startIdx; i <= endIdx; i++) {
    if (allCandles[i].high > rangeHigh) rangeHigh = allCandles[i].high
    if (allCandles[i].low < rangeLow) rangeLow = allCandles[i].low
  }

  // Set Y scale with 5% padding
  const priceRange = rangeHigh - rangeLow
  const manualMaxP = rangeHigh + priceRange * 0.05
  const manualMinP = rangeLow - priceRange * 0.05

  // Canvas dimensions - match browser layout
  // chartCanvas: 1920x1080 (main chart)
  // yAxisCanvas: 80x1080 (price labels on right)
  // xAxisCanvas: 1920x30 (time labels on bottom)
  const chartWidth = 1920
  const chartHeight = 1080
  const yAxisWidth = 80
  const xAxisHeight = 30

  // Create THREE separate canvases like browser
  const chartCanvas = createCanvas(chartWidth, chartHeight)
  const yAxisCanvas = createCanvas(yAxisWidth, chartHeight)
  const xAxisCanvas = createCanvas(chartWidth, xAxisHeight)

  const ctx = chartCanvas.getContext('2d')
  const yCtx = yAxisCanvas.getContext('2d')
  const xCtx = xAxisCanvas.getContext('2d')

  // Background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, chartWidth, chartHeight)
  yCtx.clearRect(0, 0, yAxisWidth, chartHeight)
  xCtx.clearRect(0, 0, chartWidth, xAxisHeight)

  // Calculate candle spacing (exact replica of chartRender.ts)
  const candleSpace = chartWidth / Math.max(1, visibleCount)
  const candleWidth = Math.max(1, candleSpace * 0.7)
  const timeframeMinutes = 1 // m1

  // Map price to Y coordinate (exact replica)
  const getY = (price: number) => {
    const pRange = manualMaxP - manualMinP || 1
    return chartHeight - ((price - manualMinP) / pRange) * chartHeight
  }

  // Draw candles - exact replica of chartRender.ts lines 1140-1175
  let lastDrawnTimeX = -100
  for (let i = startIdx; i <= endIdx; i++) {
    const candle = allCandles[i]
    const x = (i - viewStart) * candleSpace + candleSpace / 2
    const xLine = Math.floor(x) + 0.5

    const yO = getY(candle.open)
    const yC = getY(candle.close)
    const yH = getY(candle.high)
    const yL = getY(candle.low)

    // Wick - black line from high to low
    ctx.beginPath()
    ctx.moveTo(xLine, Math.floor(yH) + 0.5)
    ctx.lineTo(xLine, Math.floor(yL) + 0.5)
    ctx.strokeStyle = '#000000'
    ctx.stroke()

    // Body
    const bullish = candle.close > candle.open
    ctx.fillStyle = bullish ? '#22c55e' : '#000000'
    const top = Math.floor(Math.min(yO, yC)) + 0.5
    const bottom = Math.floor(Math.max(yO, yC)) + 0.5
    const height = Math.max(1, bottom - top)
    const width = Math.floor(candleWidth)
    const xBody = Math.floor(x - width / 2) + 0.5
    ctx.fillRect(xBody, top, width, height)
    ctx.strokeRect(xBody, top, width, height)

    // Draw time labels on xAxisCanvas (exact replica of chartRender.ts lines 1150-1152)
    if (x - lastDrawnTimeX > 100) {
      xCtx.fillStyle = '#6b7280'
      xCtx.font = '11px sans-serif'
      xCtx.textAlign = 'center'
      xCtx.textBaseline = 'middle'
      const timeStr = candle.time.length >= 16 ? candle.time.substring(5, 16) : candle.time
      xCtx.fillText(timeStr, xLine, xAxisHeight / 2)
      lastDrawnTimeX = xLine
    }
  }

  // Draw drawings
  renderDrawings(ctx, drawings, allCandles, getY, candleSpace, viewStart, startIdx, endIdx, chartWidth, chartHeight, timeframeMinutes)

  // Draw price scale on yAxisCanvas (right side)
  yCtx.fillStyle = '#6b7280'
  yCtx.font = '11px sans-serif'
  yCtx.textBaseline = 'middle'
  for (let i = 1; i <= 5; i++) {
    const y = (chartHeight / 6) * i
    const price = manualMaxP - (priceRange / 6) * i
    yCtx.fillText(price.toFixed(2), 10, y)
  }

  // Combine three canvases into final image (exact replica of chartCapture.ts)
  const finalWidth = chartWidth + yAxisWidth
  const finalHeight = chartHeight + xAxisHeight
  const finalCanvas = createCanvas(finalWidth, finalHeight)
  const finalCtx = finalCanvas.getContext('2d')

  finalCtx.drawImage(chartCanvas, 0, 0)
  finalCtx.drawImage(yAxisCanvas, chartWidth, 0)
  finalCtx.drawImage(xAxisCanvas, 0, chartHeight)

  const buffer = finalCanvas.toBuffer('image/png')

  // Explicit cleanup to help garbage collection
  chartCanvas.width = 0
  chartCanvas.height = 0
  yAxisCanvas.width = 0
  yAxisCanvas.height = 0
  xAxisCanvas.width = 0
  xAxisCanvas.height = 0
  finalCanvas.width = 0
  finalCanvas.height = 0

  return buffer
}
