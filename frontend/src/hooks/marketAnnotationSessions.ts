import type { Candle } from '../types/chart'
import type { DrawingDraft } from '../types/drawings/index'
import { getPreviousDateString, getPreviousTradingDay } from '../utils/time'

export function generateSessionAnnotations(
    m1Data: Candle[],
    dateStr: string,
    drawingIdCounter: number,
    getCandlesInTimeRange: (data: Candle[], dateStr: string, startTime: string, endTime: string) => Candle[],
    findTimeByDayAndClock: (data: Candle[] | undefined, day: string, clock: string) => Candle | null,
): { drawings: DrawingDraft[]; nextId: number } {
    const generated: DrawingDraft[] = []
    let nextId = drawingIdCounter

    // Helper: compute minutes from a start time string to dateStr 11:00
    const targetEndMs = new Date(`${dateStr}T11:00`).getTime()
    const lengthTo1100 = (startTime: string) => {
        const normalized = startTime.includes(' ') ? startTime.replace(' ', 'T') : startTime
        return Math.round((targetEndMs - new Date(normalized).getTime()) / 60000)
    }

    // 11:00 candle on the annotation date — used as endTime for cross-day lines
    const candle1100 = findTimeByDayAndClock(m1Data, dateStr, '11:00')

    // London High/Low (02:00-05:00)
    const londonCandles = getCandlesInTimeRange(m1Data, dateStr, '02:00', '05:00')
    if (londonCandles.length > 0) {
        const londonHigh = Math.max(...londonCandles.map((c) => c.high))
        const londonLow = Math.min(...londonCandles.map((c) => c.low))

        const londonStart = findTimeByDayAndClock(m1Data, dateStr, '02:00')
        const londonEnd = findTimeByDayAndClock(m1Data, dateStr, '05:00')

        if (londonStart && londonEnd) {
            generated.push({
                type: 'LONDON_HIGH',
                time: londonStart.time,
                price: londonHigh,
                lengthMinutes: lengthTo1100(londonStart.time),
                color: 'rgba(245, 158, 11, 0.9)',
            } as DrawingDraft)

            generated.push({
                type: 'LONDON_LOW',
                time: londonStart.time,
                price: londonLow,
                lengthMinutes: lengthTo1100(londonStart.time),
                color: 'rgba(217, 119, 6, 0.9)',
            } as DrawingDraft)
        }
    }

    // Asian High/Low (20:00-00:00 of previous calendar day — Sunday for Monday)
    const asianPrevDay = getPreviousDateString(dateStr)
    const asianPrevCandles = getCandlesInTimeRange(m1Data, asianPrevDay, '20:00', '24:00')
    const asianCurrCandles = getCandlesInTimeRange(m1Data, dateStr, '00:00', '00:01')
    const asianCandles = [...asianPrevCandles, ...asianCurrCandles]
    if (asianCandles.length > 0) {
        const asianHigh = Math.max(...asianCandles.map((c) => c.high))
        const asianLow = Math.min(...asianCandles.map((c) => c.low))

        const asianStart = findTimeByDayAndClock(m1Data, asianPrevDay, '20:00')
        if (asianStart) {
            generated.push({
                type: 'ASIAN_HIGH',
                time: asianStart.time,
                price: asianHigh,
                lengthMinutes: lengthTo1100(asianStart.time),
                color: 'rgba(37, 99, 235, 0.9)',
            } as DrawingDraft)

            generated.push({
                type: 'ASIAN_LOW',
                time: asianStart.time,
                price: asianLow,
                lengthMinutes: lengthTo1100(asianStart.time),
                color: 'rgba(29, 78, 216, 0.9)',
            } as DrawingDraft)
        }
    }

    // Previous Day PM High/Low (13:30-16:00 of previous day)
    const prevDay = getPreviousTradingDay(dateStr)
    const prevPmCandles = getCandlesInTimeRange(m1Data, prevDay, '13:30', '16:00')
    if (prevPmCandles.length > 0) {
        const prevPmHigh = Math.max(...prevPmCandles.map((c) => c.high))
        const prevPmLow = Math.min(...prevPmCandles.map((c) => c.low))

        const prevPmStart = findTimeByDayAndClock(m1Data, prevDay, '13:30')

        // 75% threshold: 150 expected minutes, need >= 113 candles
        const pmExpected = 150
        if (prevPmCandles.length >= Math.ceil(pmExpected * 0.75)) {
            const startTime = prevPmStart?.time ?? prevPmCandles[0].time
            const endTime = candle1100?.time
            generated.push({
                type: 'PREV_DAY_PM_HIGH',
                time: startTime,
                price: prevPmHigh,
                lengthMinutes: null,
                endTime,
                breakScanStart: endTime,
                color: 'rgba(20, 184, 166, 0.9)',
            } as DrawingDraft)

            generated.push({
                type: 'PREV_DAY_PM_LOW',
                time: startTime,
                price: prevPmLow,
                lengthMinutes: null,
                endTime,
                breakScanStart: endTime,
                color: 'rgba(13, 148, 136, 0.9)',
            } as DrawingDraft)
        }
    }

    // Previous Day AM High/Low (09:30-13:30 of previous day)
    const prevDayAm = getPreviousTradingDay(dateStr)
    const prevAmCandles = getCandlesInTimeRange(m1Data, prevDayAm, '09:30', '13:30')
    if (prevAmCandles.length > 0) {
        const prevAmHigh = Math.max(...prevAmCandles.map((c) => c.high))
        const prevAmLow = Math.min(...prevAmCandles.map((c) => c.low))

        const prevAmStart = findTimeByDayAndClock(m1Data, prevDayAm, '09:30')

        // 75% threshold: 240 expected minutes, need >= 180 candles
        const amExpected = 240
        if (prevAmCandles.length >= Math.ceil(amExpected * 0.75)) {
            const startTime = prevAmStart?.time ?? prevAmCandles[0].time
            const endTime = candle1100?.time
            generated.push({
                type: 'PREV_DAY_AM_HIGH',
                time: startTime,
                price: prevAmHigh,
                lengthMinutes: null,
                endTime,
                breakScanStart: endTime,
                color: 'rgba(168, 85, 247, 0.9)',
            } as DrawingDraft)

            generated.push({
                type: 'PREV_DAY_AM_LOW',
                time: startTime,
                price: prevAmLow,
                lengthMinutes: null,
                endTime,
                breakScanStart: endTime,
                color: 'rgba(126, 34, 206, 0.9)',
            } as DrawingDraft)
        }
    }

    return { drawings: generated, nextId }
}
