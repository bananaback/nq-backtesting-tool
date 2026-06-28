import type { Candle, Drawing } from './candleUtils'
import {
  findTimeByDayAndClock,
  getCandlesInRange,
  findPreviousClockClose,
  getPreviousDateString,
  getPreviousTradingDay,
  findSessionOpenOnPreviousDay,
  findPriorClockAcrossDays,
  findSwingPoints,
} from './candleUtils'

/** Generate annotations for a date (exact replica of generateMarketAnnotations) */
export function generateAnnotations(candles: Candle[], date: string): Drawing[] {
  const drawings: Drawing[] = []
  let id = 1

  // Helper: compute minutes from a start time to date 11:00
  const targetEndMs = new Date(`${date}T11:00`).getTime()
  const lengthTo1100 = (startTime: string) => {
    const normalized = startTime.includes(' ') ? startTime.replace(' ', 'T') : startTime
    return Math.round((targetEndMs - new Date(normalized).getTime()) / 60000)
  }

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

  // Asian High/Low (20:00-00:00 of previous calendar day — Sunday for Monday)
  const asianPrevDay = getPreviousDateString(date)
  const asianPrevCandles = getCandlesInRange(candles, asianPrevDay, '20:00', '24:00')
  const asianCurrCandles = getCandlesInRange(candles, date, '00:00', '00:01')
  const asianCandles = [...asianPrevCandles, ...asianCurrCandles]
  if (asianCandles.length > 0) {
    const asianHigh = Math.max(...asianCandles.map(c => c.high))
    const asianLow = Math.min(...asianCandles.map(c => c.low))

    const asianStart = findTimeByDayAndClock(candles, asianPrevDay, '20:00')
    if (asianStart) {
      drawings.push({
        id: id++,
        type: 'ASIAN_HIGH',
        time: asianStart.time,
        price: asianHigh,
        lengthMinutes: lengthTo1100(asianStart.time),
        color: 'rgba(37, 99, 235, 0.9)',
      })

      drawings.push({
        id: id++,
        type: 'ASIAN_LOW',
        time: asianStart.time,
        price: asianLow,
        lengthMinutes: lengthTo1100(asianStart.time),
        color: 'rgba(29, 78, 216, 0.9)',
      })
    }
  }

  // Previous Day PM High/Low (13:30-16:00 of previous day)
  const prevDay = getPreviousTradingDay(date)
  const prevPmCandles = getCandlesInRange(candles, prevDay, '13:30', '16:00')
  if (prevPmCandles.length > 0) {
    const prevPmHigh = Math.max(...prevPmCandles.map(c => c.high))
    const prevPmLow = Math.min(...prevPmCandles.map(c => c.low))

    const prevPmStart = findTimeByDayAndClock(candles, prevDay, '13:30')

    // 75% threshold: 150 expected minutes, need >= 113 candles
    if (prevPmCandles.length >= Math.ceil(150 * 0.75)) {
      const startTime = prevPmStart?.time || prevPmCandles[0].time
      // High line
      drawings.push({
        id: id++,
        type: 'PREV_DAY_PM_HIGH',
        time: startTime,
        price: prevPmHigh,
        lengthMinutes: null,
        endTime: timeEleven?.time,
        breakScanStart: timeEleven?.time,
        color: 'rgba(20, 184, 166, 0.9)',
      })

      // Low line
      drawings.push({
        id: id++,
        type: 'PREV_DAY_PM_LOW',
        time: startTime,
        price: prevPmLow,
        lengthMinutes: null,
        endTime: timeEleven?.time,
        breakScanStart: timeEleven?.time,
        color: 'rgba(13, 148, 136, 0.9)',
      })
    }
  }

  // Previous Day AM High/Low (09:30-13:30 of previous day)
  const prevDayAm = getPreviousTradingDay(date)
  const prevAmCandles = getCandlesInRange(candles, prevDayAm, '09:30', '13:30')
  if (prevAmCandles.length > 0) {
    const prevAmHigh = Math.max(...prevAmCandles.map(c => c.high))
    const prevAmLow = Math.min(...prevAmCandles.map(c => c.low))

    const prevAmStart = findTimeByDayAndClock(candles, prevDayAm, '09:30')

    // 75% threshold: 240 expected minutes, need >= 180 candles
    if (prevAmCandles.length >= Math.ceil(240 * 0.75)) {
      const startTime = prevAmStart?.time || prevAmCandles[0].time
      // High line
      drawings.push({
        id: id++,
        type: 'PREV_DAY_AM_HIGH',
        time: startTime,
        price: prevAmHigh,
        lengthMinutes: null,
        endTime: timeEleven?.time,
        breakScanStart: timeEleven?.time,
        color: 'rgba(168, 85, 247, 0.9)',
      })

      // Low line
      drawings.push({
        id: id++,
        type: 'PREV_DAY_AM_LOW',
        time: startTime,
        price: prevAmLow,
        lengthMinutes: null,
        endTime: timeEleven?.time,
        breakScanStart: timeEleven?.time,
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
