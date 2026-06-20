#!/usr/bin/env tsx
import { createCanvas } from 'canvas'
import fs from 'fs'
import path from 'path'

// Types (simplified from chartTypes.ts)
interface Candle {
  time: string
  open: number
  high: number
  low: number
  close: number
}

interface FibLevel {
  ratio: number
  label: string
  color: string
  visible: boolean
}

interface Drawing {
  id: number
  type: string
  time: string
  time2?: string
  price?: number
  price1?: number
  price2?: number
  top?: number
  bot?: number
  color?: string
  border?: string
  fillColor?: string
  borderColor?: string
  lengthMinutes?: number | null
  endTime?: string
  breakScanStart?: string
  reverse?: boolean
  extendRight?: boolean
  levels?: FibLevel[]
  price1614?: number
  price0930?: number
  swingType?: 'HIGH' | 'LOW'
}

// Parse CSV
function parseCSV(text: string): Candle[] {
  const lines = text.trim().split('\n')
  const candles: Candle[] = []
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',')
    if (parts.length >= 5) {
      candles.push({
        time: parts[0],
        open: parseFloat(parts[1]),
        high: parseFloat(parts[2]),
        low: parseFloat(parts[3]),
        close: parseFloat(parts[4]),
      })
    }
  }
  return candles
}

// Find candle by date and time
function findTimeByDayAndClock(candles: Candle[], date: string, clock: string): Candle | null {
  for (const candle of candles) {
    if (!candle.time.startsWith(date)) continue
    const hhmm = candle.time.includes(' ')
      ? candle.time.split(' ')[1].slice(0, 5)
      : candle.time.includes('T')
        ? candle.time.split('T')[1].slice(0, 5)
        : ''
    if (hhmm === clock) return candle
  }
  return null
}

// Get candles in time range
function getCandlesInRange(candles: Candle[], date: string, startTime: string, endTime: string): Candle[] {
  return candles.filter(c => {
    if (!c.time.startsWith(date)) return false
    const hhmm = c.time.includes(' ')
      ? c.time.split(' ')[1].slice(0, 5)
      : c.time.includes('T')
        ? c.time.split('T')[1].slice(0, 5)
        : ''
    return hhmm >= startTime && hhmm < endTime
  })
}

// Get index by time
function getIndexByTime(candles: Candle[], time: string): number {
  return candles.findIndex(c => c.time === time)
}

/** Find previous candle whose time contains clock string, searching backward from beforeIndex. @returns matching Candle or null */
function findPreviousClockClose(candles: Candle[], beforeIndex: number, clock: string): Candle | null {
  for (let i = beforeIndex - 1; i >= 0; i--) {
    if (candles[i].time.includes(clock)) return candles[i]
  }
  return null
}

/** Get previous date string in YYYY-MM-DD format. @param dateStr - Date string in YYYY-MM-DD format. @returns Previous date string. */
function getPreviousDateString(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  date.setDate(date.getDate() - 1)
  return date.toISOString().slice(0, 10)
}

/** Find session open candle (18:00) on day prior to selectedDay. @param candles - Candle array sorted by time. @param selectedDay - Date string in YYYY-MM-DD format. @returns Candle at 18:00 on previous day, or null. */
function findSessionOpenOnPreviousDay(candles: Candle[], selectedDay: string): Candle | null {
  const previousDay = getPreviousDateString(selectedDay)
  for (const candle of candles) {
    if (candle.time.startsWith(previousDay) && candle.time.includes('18:00')) {
      return candle
    }
  }
  return null
}

/** Find candle at clock time searching backward across prior days from startDay. @param candles - Candle array sorted by time. @param startDay - Start date in YYYY-MM-DD. @param clock - Time string in HH:MM. @returns Object with day and candle, or null. */
function findPriorClockAcrossDays(candles: Candle[], startDay: string, clock: string): { day: string; candle: Candle } | null {
  let day = startDay
  let iterations = 0

  while (iterations < 7) {
    const candle = findTimeByDayAndClock(candles, day, clock)
    if (candle) {
      return { day, candle }
    }
    const previousDay = getPreviousDateString(day)
    if (previousDay === day) {
      return null
    }
    day = previousDay
    iterations += 1
  }
  return null
}

/** Find swing highs and lows in 7:00-11:00 range using 5-candle pattern. @param candles - Candles to search. @param date - Date string prefix. @returns Array of swing points with time, price, and type. */
function findSwingPoints(candles: Candle[], date: string): { time: string; price: number; type: 'HIGH' | 'LOW' }[] {
  const swings: { time: string; price: number; type: 'HIGH' | 'LOW' }[] = []
  const rangeCandles = candles.filter(c => {
    if (!c.time.startsWith(date)) return false
    const hhmm = c.time.includes(' ')
      ? c.time.split(' ')[1].slice(0, 5)
      : c.time.includes('T')
        ? c.time.split('T')[1].slice(0, 5)
        : ''
    return hhmm >= '07:00' && hhmm <= '11:00'
  })

  for (let i = 2; i < rangeCandles.length - 2; i++) {
    const c = rangeCandles[i]
    // Swing High
    if (c.high > rangeCandles[i - 1].high && c.high > rangeCandles[i - 2].high &&
        c.high > rangeCandles[i + 1].high && c.high > rangeCandles[i + 2].high) {
      swings.push({ time: c.time, price: c.high, type: 'HIGH' })
    }
    // Swing Low
    if (c.low < rangeCandles[i - 1].low && c.low < rangeCandles[i - 2].low &&
        c.low < rangeCandles[i + 1].low && c.low < rangeCandles[i + 2].low) {
      swings.push({ time: c.time, price: c.low, type: 'LOW' })
    }
  }
  return swings
}

// Generate annotations for a date (exact replica of generateMarketAnnotations)
function generateAnnotations(candles: Candle[], date: string): Drawing[] {
  const drawings: Drawing[] = []
  let id = 1

  // 1. Vertical lines at :00 and :30 from 7:00 to 11:00
  const boundaries = ['07:00', '08:30', '09:30', '10:00', '10:30', '11:00']
  for (const clock of boundaries) {
    const candle = findTimeByDayAndClock(candles, date, clock)
    if (candle) {
      const vlineColor = clock === '08:30' ? '#f97316' : clock === '09:30' ? '#f59e0b' : 'rgba(0, 0, 0, 0.22)'
      drawings.push({ id: id++, type: 'VLINE', time: candle.time, color: vlineColor })
    }
  }

  // 2. PM_HIGH / PM_LOW pairs for 4 premarket windows
  const pmWindows: { start: string; end: string }[] = []

  const timeEleven = findTimeByDayAndClock(candles, date, '11:00')

  for (const w of pmWindows) {
    const rangeCandles = getCandlesInRange(candles, date, w.start, w.end)
    if (rangeCandles.length === 0) continue

    const high = Math.max(...rangeCandles.map(c => c.high))
    const low = Math.min(...rangeCandles.map(c => c.low))

    const startCandle = findTimeByDayAndClock(candles, date, w.start)
    if (!startCandle) continue

    const endBoundary = findTimeByDayAndClock(candles, date, w.end)
    if (!endBoundary) continue

    // High line
    drawings.push({
      id: id++,
      type: 'PM_HIGH',
      time: startCandle.time,
      price: high,
      lengthMinutes: null,
      endTime: timeEleven ? timeEleven.time : undefined,
      breakScanStart: endBoundary.time,
      color: 'rgba(59, 130, 246, 0.8)',
    })

    // Low line
    drawings.push({
      id: id++,
      type: 'PM_LOW',
      time: startCandle.time,
      price: low,
      lengthMinutes: null,
      endTime: timeEleven ? timeEleven.time : undefined,
      breakScanStart: endBoundary.time,
      color: 'rgba(239, 68, 68, 0.8)',
    })
  }

  // London High/Low (02:00-05:00)
  const londonCandles = getCandlesInRange(candles, date, '02:00', '05:00')
  if (londonCandles.length > 0) {
    const londonHigh = Math.max(...londonCandles.map(c => c.high))
    const londonLow = Math.min(...londonCandles.map(c => c.low))

    const londonStart = findTimeByDayAndClock(candles, date, '02:00')
    const londonEnd = findTimeByDayAndClock(candles, date, '05:00')

    if (londonStart && londonEnd) {
      // High line
      drawings.push({
        id: id++,
        type: 'LONDON_HIGH',
        time: londonStart.time,
        price: londonHigh,
        lengthMinutes: 540,
        color: 'rgba(245, 158, 11, 0.9)',
      })

      // Low line
      drawings.push({
        id: id++,
        type: 'LONDON_LOW',
        time: londonStart.time,
        price: londonLow,
        lengthMinutes: 540,
        color: 'rgba(217, 119, 6, 0.9)',
      })
    }
  }

  // Previous Day PM High/Low (13:30-16:00 of previous day)
  const prevDay = getPreviousDateString(date)
  const prevPmCandles = getCandlesInRange(candles, prevDay, '13:30', '16:00')
  if (prevPmCandles.length > 0) {
    const prevPmHigh = Math.max(...prevPmCandles.map(c => c.high))
    const prevPmLow = Math.min(...prevPmCandles.map(c => c.low))

    const prevPmStart = findTimeByDayAndClock(candles, prevDay, '13:30')
    const prevPmEnd = findTimeByDayAndClock(candles, prevDay, '16:00')

    if (prevPmStart && prevPmEnd) {
      // High line
      drawings.push({
        id: id++,
        type: 'PREV_DAY_PM_HIGH',
        time: prevPmStart.time,
        price: prevPmHigh,
        lengthMinutes: 1440,
        color: 'rgba(20, 184, 166, 0.9)',
      })

      // Low line
      drawings.push({
        id: id++,
        type: 'PREV_DAY_PM_LOW',
        time: prevPmStart.time,
        price: prevPmLow,
        lengthMinutes: 1440,
        color: 'rgba(13, 148, 136, 0.9)',
      })
    }
  }

  // Previous Day AM High/Low (09:30-13:30 of previous day)
  const prevDayAm = getPreviousDateString(date)
  const prevAmCandles = getCandlesInRange(candles, prevDayAm, '09:30', '13:30')
  if (prevAmCandles.length > 0) {
    const prevAmHigh = Math.max(...prevAmCandles.map(c => c.high))
    const prevAmLow = Math.min(...prevAmCandles.map(c => c.low))

    const prevAmStart = findTimeByDayAndClock(candles, prevDayAm, '09:30')
    const prevAmEnd = findTimeByDayAndClock(candles, prevDayAm, '13:30')

    if (prevAmStart && prevAmEnd) {
      // High line
      drawings.push({
        id: id++,
        type: 'PREV_DAY_AM_HIGH',
        time: prevAmStart.time,
        price: prevAmHigh,
        lengthMinutes: 1560,
        color: 'rgba(168, 85, 247, 0.9)',
      })

      // Low line
      drawings.push({
        id: id++,
        type: 'PREV_DAY_AM_LOW',
        time: prevAmStart.time,
        price: prevAmLow,
        lengthMinutes: 1560,
        color: 'rgba(126, 34, 206, 0.9)',
      })
    }
  }

  // 3. Fibonacci retracements for 4 opening range windows
  const fibWindows = [
    { start: '09:30', end: '10:00' },
  ]

  for (const w of fibWindows) {
    const rangeCandles = getCandlesInRange(candles, date, w.start, w.end)
    if (rangeCandles.length === 0) continue

    const high = Math.max(...rangeCandles.map(c => c.high))
    const low = Math.min(...rangeCandles.map(c => c.low))

    // Detect reverse: if high came before low, reverse=true (downtrend)
    const highIdx = rangeCandles.findIndex(c => c.high === high)
    const lowIdx = rangeCandles.findIndex(c => c.low === low)
    const reverse = highIdx < lowIdx

    const startCandle = findTimeByDayAndClock(candles, date, w.start)
    const endCandle = findTimeByDayAndClock(candles, date, w.end)
    if (!startCandle || !endCandle) continue

    drawings.push({
      id: id++,
      type: 'FIB',
      time: startCandle.time,
      time2: endCandle.time,
      price1: low,
      price2: high,
      reverse,
      extendRight: true,
      levels: [
        { ratio: 0, label: '0', visible: true, color: '#000000' },
        { ratio: 0.25, label: '0.25', visible: true, color: '#000000' },
        { ratio: 0.5, label: '0.5', visible: true, color: '#ef4444' },
        { ratio: 0.75, label: '0.75', visible: true, color: '#000000' },
        { ratio: 1, label: '1', visible: true, color: '#000000' },
      ],
    })
  }

  // 4. Macro rectangles (20-min windows: 9:50-10:10, 10:50-11:10)
  const macroWindows = [
    { start: '09:50', end: '10:10' },
    { start: '10:50', end: '11:10' },
  ]

  for (const w of macroWindows) {
    const rangeCandles = getCandlesInRange(candles, date, w.start, w.end)
    if (rangeCandles.length === 0) continue

    const high = Math.max(...rangeCandles.map(c => c.high))
    const low = Math.min(...rangeCandles.map(c => c.low))

    const startCandle = findTimeByDayAndClock(candles, date, w.start)
    if (!startCandle) continue

    drawings.push({
      id: id++,
      type: 'FVG',
      time: startCandle.time,
      top: high,
      bot: low,
      lengthMinutes: 20,
      color: 'rgba(59, 130, 246, 0.15)',
      border: 'rgba(59, 130, 246, 0.4)',
    })
  }

  // Rectangle 6:30-8:00 high/low
  const range630_800_candles = getCandlesInRange(candles, date, '06:30', '08:00')
  if (range630_800_candles.length > 0) {
    const range630High = Math.max(...range630_800_candles.map(c => c.high))
    const range630Low = Math.min(...range630_800_candles.map(c => c.low))
    const range630Start = findTimeByDayAndClock(candles, date, '06:30')
    if (range630Start) {
      drawings.push({
        id: id++,
        type: 'FVG',
        time: range630Start.time,
        top: range630High,
        bot: range630Low,
        lengthMinutes: 90,
        color: 'rgba(147, 51, 234, 0.10)',
        border: 'rgba(147, 51, 234, 0.45)',
      })
    }
  }

  // 5. ORG (Opening Range Gap)
  const openCandle = findTimeByDayAndClock(candles, date, '09:30')
  if (openCandle) {
    const openIdx = candles.indexOf(openCandle)
    const prev1614 = findPreviousClockClose(candles, openIdx, '16:14')
    if (prev1614) {
      const top = Math.max(prev1614.close, openCandle.open)
      const bot = Math.min(prev1614.close, openCandle.open)
      drawings.push({
        id: id++,
        type: 'ORG',
        time: openCandle.time,
        top,
        bot,
        lengthMinutes: null,
        price1614: prev1614.close,
        price0930: openCandle.open,
      })
    }
  }

  // 6. Swing Highs and Lows (7:00-11:00)
  const swings = findSwingPoints(candles, date)
  for (const swing of swings) {
    drawings.push({
      id: id++,
      type: 'SWING',
      time: swing.time,
      price: swing.price,
      swingType: swing.type,
    })
  }

  // 7. NWOG / NDOG (session gap rectangle)
  const dow = new Date(`${date}T12:00:00`).getDay()
  const effectiveType: 'NDOG' | 'NWOG' = dow === 0 || dow === 1 ? 'NWOG' : 'NDOG'
  const openDay = getPreviousDateString(date)
  const sessionOpenCandle = findSessionOpenOnPreviousDay(candles, date)
  if (sessionOpenCandle) {
    const priorClose = findPriorClockAcrossDays(candles, openDay, '16:14')
    if (priorClose) {
      const top = Math.max(priorClose.candle.close, sessionOpenCandle.open)
      const bot = Math.min(priorClose.candle.close, sessionOpenCandle.open)
      const fillColor = effectiveType === 'NWOG'
        ? 'rgba(0, 0, 0, 0.14)'
        : 'rgba(59, 130, 246, 0.14)'
      const borderColor = effectiveType === 'NWOG'
        ? 'rgba(0, 0, 0, 0.65)'
        : 'rgba(59, 130, 246, 0.65)'

      drawings.push({
        id: id++,
        type: effectiveType,
        time: sessionOpenCandle.time,
        top,
        bot,
        lengthMinutes: null,
        price1614: priorClose.candle.close,
        price0930: sessionOpenCandle.open,
        fillColor,
        borderColor,
      })
    }
  }

  // Open price horizontal lines (00:00, 08:30, 09:30)
  const openConfigs = [
    { clock: '00:00', type: 'OPEN_0000', len: 660, color: 'rgba(100, 116, 139, 0.9)' },
    { clock: '08:30', type: 'OPEN_0830', len: 150, color: 'rgba(100, 116, 139, 0.9)' },
    { clock: '09:30', type: 'OPEN_0930', len: 90, color: 'rgba(100, 116, 139, 0.9)' },
  ]
  for (const cfg of openConfigs) {
    const candle = findTimeByDayAndClock(candles, date, cfg.clock)
    if (!candle) continue
    drawings.push({
      id: id++,
      type: cfg.type,
      time: candle.time,
      price: candle.open,
      lengthMinutes: cfg.len,
      color: cfg.color,
    })
  }

  // 8. 0h Open (midnight open price line)
  const midnightCandle = findTimeByDayAndClock(candles, date, '00:00')
  if (midnightCandle) {
    drawings.push({
      id: id++,
      type: 'OPEN_LINE',
      time: midnightCandle.time,
      price: midnightCandle.open,
      color: 'rgba(107, 114, 128, 0.5)',
    })
  }

  // 9. 8:30 Open (8:30 open price line)
  const open830Candle = findTimeByDayAndClock(candles, date, '08:30')
  if (open830Candle) {
    drawings.push({
      id: id++, // eslint-disable-line no-useless-assignment
      type: 'OPEN_LINE',
      time: open830Candle.time,
      price: open830Candle.open,
      color: 'rgba(107, 114, 128, 0.5)',
    })
  }

  return drawings
}

// Render chart to canvas (exact replica of drawTradingChart with 3 canvases)
function renderChart(allCandles: Candle[], drawings: Drawing[], date: string): Buffer {
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

// Small delay helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Process dates in parallel with concurrency limit
async function processDatesInParallel(
  datesToProcess: string[],
  m1Candles: Candle[],
  outputDir: string,
  concurrency: number = 8
): Promise<void> {
  let processed = 0
  const total = datesToProcess.length
  
  // Process in batches
  for (let i = 0; i < total; i += concurrency) {
    const batch = datesToProcess.slice(i, i + concurrency)
    
    await Promise.all(batch.map(async (date) => {
      try {
        const annotations = generateAnnotations(m1Candles, date)
        const buffer = renderChart(m1Candles, annotations, date)
        
        const outputPath = path.join(outputDir, `${date}.png`)
        fs.writeFileSync(outputPath, buffer)
        
        processed++
        console.log(`[${processed}/${total}] Saved: ${date}.png`)
      } catch (error) {
        console.error(`  Error processing ${date}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }))
    
    // Force garbage collection after each batch
    if (global.gc) {
      global.gc()
    }
    
    // Small delay between batches
    if (i + concurrency < total) {
      await sleep(50)
    }
  }
}

// Main
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const limitArg = args.find(a => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined

  const dataDir = path.join(process.cwd(), 'data')
  const outputDir = path.join(process.cwd(), 'output')

  if (!fs.existsSync(dataDir)) {
    console.error('data/ folder not found')
    process.exit(1)
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Load m1 data
  const m1File = fs.readdirSync(dataDir).find((f: string) => f.includes('m1'))
  if (!m1File) {
    console.error('No m1 CSV file found in data/')
    process.exit(1)
  }

  console.log(`Loading ${m1File}...`)
  const m1Text = fs.readFileSync(path.join(dataDir, m1File), 'utf-8')
  const m1Candles = parseCSV(m1Text)

  if (m1Candles.length === 0) {
    console.error('No candles parsed from CSV')
    process.exit(1)
  }

  // Get all unique dates
  const dates = Array.from(new Set(m1Candles.map(c => c.time.split(' ')[0] || c.time.split('T')[0]))).sort()
  console.log(`Found ${dates.length} trading days`)

  // Apply limit if specified
  const datesToProcess = limit ? dates.slice(0, limit) : dates
  if (limit) {
    console.log(`Processing first ${limit} days only`)
  }

  console.log(`Processing ${datesToProcess.length} dates with concurrency 8...`)
  await processDatesInParallel(datesToProcess, m1Candles, outputDir, 8)
  
  console.log('Done!')
}

main().catch(console.error)
