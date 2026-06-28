import type { Candle, Drawing } from './candleUtils'
import {
  findTimeByDayAndClock,
  getCandlesInRange,
  getPreviousDateString,
  getPreviousTradingDay,
} from './candleUtils'

/** London High/Low (02:00-05:00) */
export function createLondonHighLow(
  candles: Candle[],
  date: string,
  idStart: number,
): { drawings: Drawing[]; nextId: number } {
  const drawings: Drawing[] = []
  let id = idStart

  const londonCandles = getCandlesInRange(candles, date, '02:00', '05:00')
  if (londonCandles.length > 0) {
    const londonHigh = Math.max(...londonCandles.map(c => c.high))
    const londonLow = Math.min(...londonCandles.map(c => c.low))

    const londonStart = findTimeByDayAndClock(candles, date, '02:00')
    const londonEnd = findTimeByDayAndClock(candles, date, '05:00')

    if (londonStart && londonEnd) {
      drawings.push({
        id: id++,
        type: 'LONDON_HIGH',
        time: londonStart.time,
        price: londonHigh,
        lengthMinutes: 540,
        color: 'rgba(245, 158, 11, 0.9)',
      })

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

  return { drawings, nextId: id }
}

/** Asian High/Low (20:00-00:00 prev day + 00:00-00:01 current) */
export function createAsianHighLow(
  candles: Candle[],
  date: string,
  idStart: number,
  lengthTo1100: (startTime: string) => number,
): { drawings: Drawing[]; nextId: number } {
  const drawings: Drawing[] = []
  let id = idStart

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

  return { drawings, nextId: id }
}

/** Previous Day PM High/Low (13:30-16:00) */
export function createPrevDayPMHighLow(
  candles: Candle[],
  date: string,
  idStart: number,
  timeEleven: { time: string } | null,
): { drawings: Drawing[]; nextId: number } {
  const drawings: Drawing[] = []
  let id = idStart

  const prevDay = getPreviousTradingDay(date)
  const prevPmCandles = getCandlesInRange(candles, prevDay, '13:30', '16:00')
  if (prevPmCandles.length > 0) {
    const prevPmHigh = Math.max(...prevPmCandles.map(c => c.high))
    const prevPmLow = Math.min(...prevPmCandles.map(c => c.low))

    const prevPmStart = findTimeByDayAndClock(candles, prevDay, '13:30')

    if (prevPmCandles.length >= Math.ceil(150 * 0.75)) {
      const startTime = prevPmStart?.time || prevPmCandles[0].time
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

  return { drawings, nextId: id }
}

/** Previous Day AM High/Low (09:30-13:30) */
export function createPrevDayAMHighLow(
  candles: Candle[],
  date: string,
  idStart: number,
  timeEleven: { time: string } | null,
): { drawings: Drawing[]; nextId: number } {
  const drawings: Drawing[] = []
  let id = idStart

  const prevDayAm = getPreviousTradingDay(date)
  const prevAmCandles = getCandlesInRange(candles, prevDayAm, '09:30', '13:30')
  if (prevAmCandles.length > 0) {
    const prevAmHigh = Math.max(...prevAmCandles.map(c => c.high))
    const prevAmLow = Math.min(...prevAmCandles.map(c => c.low))

    const prevAmStart = findTimeByDayAndClock(candles, prevDayAm, '09:30')

    if (prevAmCandles.length >= Math.ceil(240 * 0.75)) {
      const startTime = prevAmStart?.time || prevAmCandles[0].time
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

  return { drawings, nextId: id }
}

/** Previous Day Full Range + 3 Previous Day Range (merged when same price) */
export function createPrevDayAnd3DayRange(
  candles: Candle[],
  date: string,
  idStart: number,
  lengthTo1100: (startTime: string) => number,
): { drawings: Drawing[]; nextId: number } {
  const drawings: Drawing[] = []
  let id = idStart

  // Collect ALL candles for full 24h day (00:00:00 to 23:59:59) — not a session window
  const prevDay = getPreviousTradingDay(date)
  const prevDayCandles = candles.filter(c => c.time.startsWith(prevDay))

  // Compute 3-day candles
  const threeDayCandles: Candle[] = []
  let walkDay = date
  for (let i = 0; i < 3; i++) {
    walkDay = getPreviousTradingDay(walkDay)
    threeDayCandles.push(...candles.filter(c => c.time.startsWith(walkDay)))
  }

  const anchor0700 = findTimeByDayAndClock(candles, date, '07:00')
  if (anchor0700) {
    const lenMin = lengthTo1100(anchor0700.time)

    // Compute prev day values (if available)
    let prevDayHigh: number | null = null
    let prevDayLow: number | null = null
    if (prevDayCandles.length > 0) {
      prevDayHigh = Math.max(...prevDayCandles.map(c => c.high))
      prevDayLow = Math.min(...prevDayCandles.map(c => c.low))
    }

    // Compute 3-day values (if available)
    let threeDayHigh: number | null = null
    let threeDayLow: number | null = null
    if (threeDayCandles.length > 0) {
      threeDayHigh = Math.max(...threeDayCandles.map(c => c.high))
      threeDayLow = Math.min(...threeDayCandles.map(c => c.low))
    }

    // Emit high line(s) — merge if same price
    if (prevDayHigh !== null && threeDayHigh !== null && prevDayHigh === threeDayHigh) {
      drawings.push({
        id: id++,
        type: 'PREV_DAY_3DAY_RANGE_HIGH',
        time: anchor0700.time,
        price: prevDayHigh,
        lengthMinutes: lenMin,
        color: 'rgba(234, 179, 8, 0.85)',
      })
    } else {
      if (prevDayHigh !== null) {
        drawings.push({
          id: id++,
          type: 'PREV_DAY_RANGE_HIGH',
          time: anchor0700.time,
          price: prevDayHigh,
          lengthMinutes: lenMin,
          color: 'rgba(234, 179, 8, 0.85)',
        })
      }
      if (threeDayHigh !== null) {
        drawings.push({
          id: id++,
          type: 'PREV_3DAY_RANGE_HIGH',
          time: anchor0700.time,
          price: threeDayHigh,
          lengthMinutes: lenMin,
          color: 'rgba(249, 115, 22, 0.80)',
        })
      }
    }

    // Emit low line(s) — merge if same price
    if (prevDayLow !== null && threeDayLow !== null && prevDayLow === threeDayLow) {
      drawings.push({
        id: id++,
        type: 'PREV_DAY_3DAY_RANGE_LOW',
        time: anchor0700.time,
        price: prevDayLow,
        lengthMinutes: lenMin,
        color: 'rgba(202, 138, 4, 0.85)',
      })
    } else {
      if (prevDayLow !== null) {
        drawings.push({
          id: id++,
          type: 'PREV_DAY_RANGE_LOW',
          time: anchor0700.time,
          price: prevDayLow,
          lengthMinutes: lenMin,
          color: 'rgba(202, 138, 4, 0.85)',
        })
      }
      if (threeDayLow !== null) {
        drawings.push({
          id: id++,
          type: 'PREV_3DAY_RANGE_LOW',
          time: anchor0700.time,
          price: threeDayLow,
          lengthMinutes: lenMin,
          color: 'rgba(234, 88, 12, 0.80)',
        })
      }
    }
  }

  return { drawings, nextId: id }
}
