import type { Candle, Drawing } from './candleUtils'
import { findTimeByDayAndClock, getCandlesInRange } from './candleUtils'
import {
  createLondonHighLow,
  createAsianHighLow,
  createPrevDayPMHighLow,
  createPrevDayAMHighLow,
  createPrevDayAnd3DayRange,
} from './annotationSessions'
import {
  createFibLevels,
  createFvgRects,
  createOrgGap,
  createSwingPoints,
  createSessionGap,
  createOpenLines,
} from './annotationGaps'

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

  // 2. PM_HIGH / PM_LOW pairs for 4 premarket windows (empty — kept for structure)
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

  // Session annotations
  let result = createLondonHighLow(candles, date, id)
  drawings.push(...result.drawings)
  id = result.nextId

  result = createAsianHighLow(candles, date, id, lengthTo1100)
  drawings.push(...result.drawings)
  id = result.nextId

  result = createPrevDayPMHighLow(candles, date, id, timeEleven)
  drawings.push(...result.drawings)
  id = result.nextId

  result = createPrevDayAMHighLow(candles, date, id, timeEleven)
  drawings.push(...result.drawings)
  id = result.nextId

  result = createPrevDayAnd3DayRange(candles, date, id, lengthTo1100)
  drawings.push(...result.drawings)
  id = result.nextId

  // Gap / FVG / fib / swing / open annotations
  result = createFibLevels(candles, date, id)
  drawings.push(...result.drawings)
  id = result.nextId

  result = createFvgRects(candles, date, id)
  drawings.push(...result.drawings)
  id = result.nextId

  result = createOrgGap(candles, date, id)
  drawings.push(...result.drawings)
  id = result.nextId

  result = createSwingPoints(candles, date, id)
  drawings.push(...result.drawings)
  id = result.nextId

  result = createSessionGap(candles, date, id)
  drawings.push(...result.drawings)
  id = result.nextId

  result = createOpenLines(candles, date, id)
  drawings.push(...result.drawings)

  return drawings
}
