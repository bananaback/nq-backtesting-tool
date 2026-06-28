import type { Candle, Drawing } from './candleUtils'
import {
  findTimeByDayAndClock,
  getCandlesInRange,
  findPreviousClockClose,
  getPreviousDateString,
  findSessionOpenOnPreviousDay,
  findPriorClockAcrossDays,
  findSwingPoints,
} from './candleUtils'

/** Fibonacci retracements for 09:30-10:00 ORB */
export function createFibLevels(
  candles: Candle[],
  date: string,
  idStart: number,
): { drawings: Drawing[]; nextId: number } {
  const drawings: Drawing[] = []
  let id = idStart

  const fibWindows = [
    { start: '09:30', end: '10:00' },
  ]

  for (const w of fibWindows) {
    const rangeCandles = getCandlesInRange(candles, date, w.start, w.end)
    if (rangeCandles.length === 0) continue

    const high = Math.max(...rangeCandles.map(c => c.high))
    const low = Math.min(...rangeCandles.map(c => c.low))

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

  return { drawings, nextId: id }
}

/** FVG rectangles (9:50-10:10, 10:50-11:10) */
export function createFvgRects(
  candles: Candle[],
  date: string,
  idStart: number,
): { drawings: Drawing[]; nextId: number } {
  const drawings: Drawing[] = []
  let id = idStart

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

  return { drawings, nextId: id }
}

/** ORG (Opening Range Gap) */
export function createOrgGap(
  candles: Candle[],
  date: string,
  idStart: number,
): { drawings: Drawing[]; nextId: number } {
  const drawings: Drawing[] = []
  let id = idStart

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

  return { drawings, nextId: id }
}

/** Swing Highs and Lows (7:00-11:00) */
export function createSwingPoints(
  candles: Candle[],
  date: string,
  idStart: number,
): { drawings: Drawing[]; nextId: number } {
  const drawings: Drawing[] = []
  let id = idStart

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

  return { drawings, nextId: id }
}

/** NWOG / NDOG (session gap rectangle) */
export function createSessionGap(
  candles: Candle[],
  date: string,
  idStart: number,
): { drawings: Drawing[]; nextId: number } {
  const drawings: Drawing[] = []
  let id = idStart

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

  return { drawings, nextId: id }
}

/** Open price horizontal lines (00:00, 08:30, 09:30) */
export function createOpenLines(
  candles: Candle[],
  date: string,
  idStart: number,
): { drawings: Drawing[]; nextId: number } {
  const drawings: Drawing[] = []
  let id = idStart

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

  // Midnight open price line
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

  // 8:30 open price line
  const open830Candle = findTimeByDayAndClock(candles, date, '08:30')
  if (open830Candle) {
    drawings.push({
      id: id++,
      type: 'OPEN_LINE',
      time: open830Candle.time,
      price: open830Candle.open,
      color: 'rgba(107, 114, 128, 0.5)',
    })
  }

  return { drawings, nextId: id }
}
