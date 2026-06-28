// Types (simplified from chartTypes.ts)
export interface Candle {
  time: string
  open: number
  high: number
  low: number
  close: number
}

export interface FibLevel {
  ratio: number
  label: string
  color: string
  visible: boolean
}

export interface Drawing {
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
export function parseCSV(text: string): Candle[] {
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
export function findTimeByDayAndClock(candles: Candle[], date: string, clock: string): Candle | null {
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
export function getCandlesInRange(candles: Candle[], date: string, startTime: string, endTime: string): Candle[] {
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
export function getIndexByTime(candles: Candle[], time: string): number {
  return candles.findIndex(c => c.time === time)
}

/** Find previous candle whose time contains clock string, searching backward from beforeIndex. @returns matching Candle or null */
export function findPreviousClockClose(candles: Candle[], beforeIndex: number, clock: string): Candle | null {
  for (let i = beforeIndex - 1; i >= 0; i--) {
    if (candles[i].time.includes(clock)) return candles[i]
  }
  return null
}

/** Get previous date string in YYYY-MM-DD format. @param dateStr - Date string in YYYY-MM-DD format. @returns Previous date string. */
export function getPreviousDateString(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  date.setDate(date.getDate() - 1)
  return date.toISOString().slice(0, 10)
}

/** Get the previous trading day, skipping weekends.
 * On Monday returns Friday (back 3 days). On Sunday returns Friday (back 2 days).
 * All other days return the previous calendar day.
 * @param dateStr - Date string in YYYY-MM-DD format.
 * @returns Previous trading date in YYYY-MM-DD format.
 */
export function getPreviousTradingDay(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  const dow = date.getDay()
  if (dow === 1) {
    // Monday → Friday
    date.setDate(date.getDate() - 3)
  } else if (dow === 0) {
    // Sunday → Friday
    date.setDate(date.getDate() - 2)
  } else {
    date.setDate(date.getDate() - 1)
  }
  return date.toISOString().slice(0, 10)
}

/** Find session open candle (18:00) on day prior to selectedDay. @param candles - Candle array sorted by time. @param selectedDay - Date string in YYYY-MM-DD format. @returns Candle at 18:00 on previous day, or null. */
export function findSessionOpenOnPreviousDay(candles: Candle[], selectedDay: string): Candle | null {
  const previousDay = getPreviousDateString(selectedDay)
  for (const candle of candles) {
    if (candle.time.startsWith(previousDay) && candle.time.includes('18:00')) {
      return candle
    }
  }
  return null
}

/** Find candle at clock time searching backward across prior days from startDay. @param candles - Candle array sorted by time. @param startDay - Start date in YYYY-MM-DD. @param clock - Time string in HH:MM. @returns Object with day and candle, or null. */
export function findPriorClockAcrossDays(candles: Candle[], startDay: string, clock: string): { day: string; candle: Candle } | null {
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
export function findSwingPoints(candles: Candle[], date: string): { time: string; price: number; type: 'HIGH' | 'LOW' }[] {
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
