import { createCanvas } from 'canvas'
import { Candle, Drawing, findTimeByDayAndClock, getIndexByTime } from './candleUtils'

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

  // Draw drawings (exact replica of chartRender.ts logic)
  for (const tool of drawings) {
    const index = getIndexByTime(allCandles, tool.time)
    if (index === -1) continue

    const x = (index - viewStart) * candleSpace + candleSpace / 2

    if (tool.type === 'VLINE') {
      ctx.save()
      ctx.strokeStyle = tool.color || 'rgba(0, 0, 0, 0.22)'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, chartHeight)
      ctx.stroke()
      ctx.restore()
    } else if (tool.type === 'PM_HIGH' || tool.type === 'PM_LOW' || tool.type === 'OPEN_0000' || tool.type === 'OPEN_0830' || tool.type === 'OPEN_0930') {
      if (tool.price === undefined) continue
      const y = getY(tool.price)

      // Determine scan boundaries (exact replica)
      let scanStartIdx = index + 1
      let scanEndIdx = endIdx

      if (tool.breakScanStart) {
        const bsi = getIndexByTime(allCandles, tool.breakScanStart)
        if (bsi !== -1) scanStartIdx = bsi + 1
      }
      if (tool.endTime) {
        const eti = getIndexByTime(allCandles, tool.endTime)
        if (eti !== -1) scanEndIdx = eti
      }

      // Scan forward for first candle wick crossing this price level
      let crossCandleIdx = -1
      for (let i = scanStartIdx; i <= scanEndIdx; i++) {
        if (allCandles[i].low <= tool.price && tool.price <= allCandles[i].high) {
          crossCandleIdx = i
          break
        }
      }

      let endX: number
      if (crossCandleIdx !== -1) {
        endX = (crossCandleIdx - viewStart) * candleSpace + candleSpace / 2
      } else {
        endX = (scanEndIdx - viewStart) * candleSpace + candleSpace / 2
      }

      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(endX, y)
      ctx.strokeStyle = tool.color || '#000000'
      ctx.lineWidth = 1
      ctx.stroke()
      // Draw label for open price lines
      if (tool.type === 'OPEN_0000' || tool.type === 'OPEN_0830' || tool.type === 'OPEN_0930') {
        const label = tool.type === 'OPEN_0000' ? '0:00 Open' : tool.type === 'OPEN_0830' ? '8:30 Open' : '9:30 Open'
        ctx.save()
        ctx.fillStyle = tool.color || '#000000'
        ctx.font = 'bold 10px sans-serif'
        const labelX = Math.max(4, x + 4)
        ctx.fillText(label, labelX, y - 4)
        ctx.restore()
      }
    } else if (tool.type === 'FIB') {
      if (tool.price1 === undefined || tool.price2 === undefined || !tool.time2) continue
      const index2 = getIndexByTime(allCandles, tool.time2)
      if (index2 === -1) continue

      const x1 = x
      const x2 = (index2 - viewStart) * candleSpace + candleSpace / 2
      const leftX = Math.min(x1, x2)
      const rightX = Math.max(x1, x2)

      // Draw anchor dots
      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.arc(x1, getY(tool.price1), 2.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x2, getY(tool.price2), 2.5, 0, Math.PI * 2)
      ctx.fill()

      // Draw levels
      if (tool.levels) {
        for (const level of tool.levels) {
          if (!level.visible) continue
          const levelPrice = tool.reverse
            ? tool.price2 + (tool.price1 - tool.price2) * level.ratio
            : tool.price1 + (tool.price2 - tool.price1) * level.ratio
          const y = getY(levelPrice)

          ctx.strokeStyle = level.color || '#000000'
          ctx.lineWidth = 1.5
          ctx.setLineDash([])
          ctx.beginPath()
          ctx.moveTo(leftX, y)
          ctx.lineTo(rightX, y)
          ctx.stroke()

          ctx.fillStyle = level.color || '#000000'
          ctx.font = 'bold 10px sans-serif'
          ctx.fillText(level.label, rightX - 44, y - 4)
        }
      }
    } else if (tool.type === 'FVG') {
      if (tool.top === undefined || tool.bot === undefined) continue
      const yTop = getY(tool.top)
      const yBot = getY(tool.bot)
      const rectHeight = Math.abs(yBot - yTop)
      const yDraw = Math.min(yTop, yBot)
      const lengthMinutes = tool.lengthMinutes ?? null
      const rectWidth = lengthMinutes === null ? chartWidth - x : Math.max(1, (lengthMinutes / timeframeMinutes) * candleSpace)

      ctx.fillStyle = tool.color || 'rgba(59, 130, 246, 0.15)'
      ctx.fillRect(x, yDraw, rectWidth, rectHeight)
      ctx.strokeStyle = tool.border || 'rgba(59, 130, 246, 0.4)'
      ctx.lineWidth = 1
      ctx.strokeRect(x, yDraw, rectWidth, rectHeight)
    } else if (tool.type === 'ORG') {
      if (tool.top === undefined || tool.bot === undefined || tool.price1614 === undefined || tool.price0930 === undefined) continue
      const yTop = getY(tool.top)
      const yBot = getY(tool.bot)
      const height = Math.abs(yBot - yTop)
      const yDraw = Math.min(yTop, yBot)
      const isPremium = tool.price0930 > tool.price1614
      const fillColor = isPremium ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)'
      const borderColor = isPremium ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'

      ctx.save()
      ctx.fillStyle = fillColor
      ctx.strokeStyle = borderColor
      ctx.setLineDash([2, 2])
      ctx.lineWidth = 1

      const rectWidth = chartWidth - x
      ctx.fillRect(x, yDraw, rectWidth, height)
      ctx.strokeRect(x, yDraw, rectWidth, height)

      // Draw 0.25, 0.5, 0.75 levels
      ctx.setLineDash([4, 4])
      ctx.lineWidth = 0.5
      for (const lvl of [0.25, 0.5, 0.75]) {
        const yLvl = getY(tool.price1614 + (tool.price0930 - tool.price1614) * lvl)
        ctx.beginPath()
        ctx.moveTo(x, yLvl)
        ctx.lineTo(chartWidth, yLvl)
        ctx.stroke()

        ctx.fillStyle = isPremium ? '#15803d' : '#b91c1c'
        ctx.font = '8px sans-serif'
        ctx.fillText(lvl.toString(), chartWidth - 25, yLvl - 2)
      }

      ctx.restore()
    } else if (tool.type === 'NDOG' || tool.type === 'NWOG') {
      if (tool.top === undefined || tool.bot === undefined || tool.price1614 === undefined || tool.price0930 === undefined) continue
      const yTop = getY(tool.top)
      const yBot = getY(tool.bot)
      const height = Math.abs(yBot - yTop)
      const yDraw = Math.min(yTop, yBot)

      const fillColor = tool.fillColor ?? 'rgba(59, 130, 246, 0.14)'
      const borderColor = tool.borderColor ?? 'rgba(59, 130, 246, 0.65)'

      // Clamp x to 0 since 18:00 candle is before 6:30 chart start
      const rectX = Math.max(0, x)
      const rectWidth = chartWidth - rectX

      ctx.save()
      ctx.fillStyle = fillColor
      ctx.strokeStyle = borderColor
      ctx.setLineDash([2, 2])
      ctx.lineWidth = 1

      ctx.fillRect(rectX, yDraw, rectWidth, height)
      ctx.strokeRect(rectX, yDraw, rectWidth, height)

      // Draw 0.25, 0.5, 0.75 levels
      ctx.setLineDash([4, 4])
      ctx.lineWidth = 0.5
      for (const lvl of [0.25, 0.5, 0.75]) {
        const yLvl = getY(tool.price1614 + (tool.price0930 - tool.price1614) * lvl)
        ctx.beginPath()
        ctx.moveTo(rectX, yLvl)
        ctx.lineTo(chartWidth, yLvl)
        ctx.stroke()

        ctx.fillStyle = borderColor
        ctx.font = '8px sans-serif'
        ctx.fillText(lvl.toString(), chartWidth - 25, yLvl - 2)
      }

      // Draw type label
      ctx.fillStyle = borderColor
      ctx.font = 'bold 10px sans-serif'
      ctx.fillText(tool.type, rectX + 8, yDraw + 14)

      ctx.restore()
    } else if (tool.type === 'OPEN_LINE') {
      if (tool.price === undefined) continue
      const y = getY(tool.price)

      // Clamp x to 0 for 00:00 candle (before 6:30 chart start)
      const lineX = Math.max(0, x)

      ctx.save()
      ctx.strokeStyle = tool.color ?? 'rgba(107, 114, 128, 0.5)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])

      ctx.beginPath()
      ctx.moveTo(lineX, y)
      ctx.lineTo(chartWidth, y)
      ctx.stroke()

      ctx.restore()
    } else if (tool.type === 'SWING') {
      if (tool.price === undefined || !tool.swingType) continue
      const y = getY(tool.price)
      const isHigh = tool.swingType === 'HIGH'

      // Draw small marker
      ctx.fillStyle = isHigh ? '#dc2626' : '#16a34a'
      ctx.beginPath()
      if (isHigh) {
        // Triangle pointing down at high
        ctx.moveTo(x, y)
        ctx.lineTo(x - 4, y - 6)
        ctx.lineTo(x + 4, y - 6)
      } else {
        // Triangle pointing up at low
        ctx.moveTo(x, y)
        ctx.lineTo(x - 4, y + 6)
        ctx.lineTo(x + 4, y + 6)
      }
      ctx.closePath()
      ctx.fill()

      // Draw time label
      const timeStr = tool.time.includes(' ')
        ? tool.time.split(' ')[1].slice(0, 5)
        : tool.time.includes('T')
          ? tool.time.split('T')[1].slice(0, 5)
          : ''
      ctx.fillStyle = isHigh ? '#dc2626' : '#16a34a'
      ctx.font = 'bold 9px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(timeStr, x, isHigh ? y - 10 : y + 16)
      ctx.textAlign = 'start' // reset
    }
  }

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
