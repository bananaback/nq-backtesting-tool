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
