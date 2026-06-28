import type { Candle } from '../types/chart'
import type { DrawingDraft } from '../types/drawings/index'
import { getDefaultFibLevels } from '../constants/chart'
import { getPreviousDateString } from '../utils/time'

export function generateGapAnnotations(
    m1Data: Candle[],
    dateStr: string,
    drawingIdCounter: number,
    getCandlesInTimeRange: (data: Candle[], dateStr: string, startTime: string, endTime: string) => Candle[],
    findTimeByDayAndClock: (data: Candle[] | undefined, day: string, clock: string) => Candle | null,
    findPreviousClockClose: (data: Candle[] | undefined, beforeIndex: number, clock: string) => Candle | null,
    findPriorClockAcrossDays: (data: Candle[] | undefined, startDay: string, clock: string) => { day: string; candle: Candle } | null,
    findSessionOpenOnPreviousDay: (data: Candle[] | undefined, selectedDay: string) => Candle | null,
    buildSessionGapDrawing: (type: 'ORG' | 'NDOG' | 'NWOG', gapTime: string, prevClose: number, sessionOpen: number) => DrawingDraft,
    findMostRecentSunday: (d: string) => string,
): { drawings: DrawingDraft[]; nextId: number } {
    const generated: DrawingDraft[] = []
    let nextId = drawingIdCounter

    // Helper: compute minutes from a start time string to dateStr 11:00
    const targetEndMs = new Date(`${dateStr}T11:00`).getTime()
    const lengthTo1100 = (startTime: string) => {
        const normalized = startTime.includes(' ') ? startTime.replace(' ', 'T') : startTime
        return Math.round((targetEndMs - new Date(normalized).getTime()) / 60000)
    }

    // FibDrawing for opening range windows
    const fibWindows: Array<{ start: string; end: string }> = [
        { start: '09:30', end: '10:00' },
    ]

    for (const w of fibWindows) {
        const candles = getCandlesInTimeRange(m1Data, dateStr, w.start, w.end)
        if (candles.length === 0) continue
        const high = Math.max(...candles.map((c) => c.high))
        const low = Math.min(...candles.map((c) => c.low))

        // Detect reverse: if high came before low, reverse=true (downtrend)
        const highIdx = candles.findIndex((c) => c.high === high)
        const lowIdx = candles.findIndex((c) => c.low === low)
        const reverse = highIdx < lowIdx

        const startCandle = findTimeByDayAndClock(m1Data, dateStr, w.start)
        const endCandle = findTimeByDayAndClock(m1Data, dateStr, w.end)
        if (!startCandle || !endCandle) continue

        generated.push({
            type: 'FIB',
            time: startCandle.time,
            time2: endCandle.time,
            price1: low,
            price2: high,
            templateKey: 'fibo_quadrant',
            extendRight: true,
            reverse,
            lineStyle: 'normal',
            lineWidth: 1.5,
            levels: getDefaultFibLevels('fibo_quadrant').map((l) => l.ratio === 0.5 ? { ...l, color: '#ef4444' } : l),
        })
    }

    // Macro rectangles (20-min windows: 9:50-10:10, 10:50-11:10)
    const macroWindows: Array<{ start: string; end: string }> = [
        { start: '09:50', end: '10:10' },
        { start: '10:50', end: '11:10' },
    ]

    for (const w of macroWindows) {
        const candles = getCandlesInTimeRange(m1Data, dateStr, w.start, w.end)
        if (candles.length === 0) continue
        const high = Math.max(...candles.map((c) => c.high))
        const low = Math.min(...candles.map((c) => c.low))

        const startCandle = findTimeByDayAndClock(m1Data, dateStr, w.start)
        if (!startCandle) continue

        generated.push({
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
    const range630_800_candles = getCandlesInTimeRange(m1Data, dateStr, '06:30', '08:00')
    const range630Start = range630_800_candles.length > 0 ? findTimeByDayAndClock(m1Data, dateStr, '06:30') : null
    if (range630_800_candles.length > 0) {
        const range630High = Math.max(...range630_800_candles.map((c) => c.high))
        const range630Low = Math.min(...range630_800_candles.map((c) => c.low))
        if (range630Start) {
            generated.push({
                type: 'FVG',
                time: range630Start.time,
                top: range630High,
                bot: range630Low,
                lengthMinutes: 90,
                color: 'rgba(147, 51, 234, 0.10)',
                border: 'rgba(147, 51, 234, 0.45)',
            } as DrawingDraft)
        }
    }

    // Premarket 6:30-8:00 High/Low lines (with text labels)
    if (range630_800_candles.length > 0 && range630Start) {
        const preHigh = Math.max(...range630_800_candles.map((c) => c.high))
        const preLow = Math.min(...range630_800_candles.map((c) => c.low))
        generated.push({
            type: 'PRE_HIGH',
            time: range630Start.time,
            price: preHigh,
            lengthMinutes: lengthTo1100(range630Start.time),
            color: 'rgba(236, 72, 153, 0.9)',
        } as DrawingDraft)

        generated.push({
            type: 'PRE_LOW',
            time: range630Start.time,
            price: preLow,
            lengthMinutes: lengthTo1100(range630Start.time),
            color: 'rgba(190, 24, 93, 0.9)',
        } as DrawingDraft)
    }

    // NWOG — gap between most recent Sunday 18:00 open and prior Friday 16:14 close
    const recentSunday = findMostRecentSunday(dateStr)
    const nwogOpenCandle = findTimeByDayAndClock(m1Data, recentSunday, '18:00')
    if (nwogOpenCandle) {
        const nwogClosePrior = findPriorClockAcrossDays(m1Data, recentSunday, '16:14')
        if (nwogClosePrior) {
            generated.push(buildSessionGapDrawing('NWOG', nwogOpenCandle.time, nwogClosePrior.candle.close, nwogOpenCandle.open))
        }
    }

    // NDOG — gap between previous day 18:00 open and prior 16:14 close (Mon skip)
    const dow = new Date(`${dateStr}T12:00:00`).getDay()
    if (dow !== 1) {
        const ndogOpenCandle = findSessionOpenOnPreviousDay(m1Data, dateStr)
        if (ndogOpenCandle) {
            const openDay = getPreviousDateString(dateStr)
            const ndogClosePrior = findPriorClockAcrossDays(m1Data, openDay, '16:14')
            if (ndogClosePrior) {
                generated.push(buildSessionGapDrawing('NDOG', ndogOpenCandle.time, ndogClosePrior.candle.close, ndogOpenCandle.open))
            }
        }
    }

    // Open price horizontal lines (00:00, 08:30, 09:30) extending to 11:00
    const openLineConfigs = [
        { clock: '00:00', type: 'OPEN_0000' as const, lengthMinutes: 660, color: 'rgba(100, 116, 139, 0.9)' },
        { clock: '08:30', type: 'OPEN_0830' as const, lengthMinutes: 150, color: 'rgba(100, 116, 139, 0.9)' },
        { clock: '09:30', type: 'OPEN_0930' as const, lengthMinutes: 90, color: 'rgba(100, 116, 139, 0.9)' },
    ]
    for (const cfg of openLineConfigs) {
        const candle = findTimeByDayAndClock(m1Data, dateStr, cfg.clock)
        if (!candle) continue
        generated.push({
            type: cfg.type,
            time: candle.time,
            price: candle.open,
            lengthMinutes: cfg.lengthMinutes,
            color: cfg.color,
        } as DrawingDraft)
    }

    // ORG (Opening Range Gap) — 09:30 open vs prior 16:14 close
    const orgOpenCandle = findTimeByDayAndClock(m1Data, dateStr, '09:30')
    if (orgOpenCandle) {
        const orgOpenIdx = m1Data.indexOf(orgOpenCandle)
        const prev1614 = findPreviousClockClose(m1Data, orgOpenIdx, '16:14')
        if (prev1614) {
            generated.push(buildSessionGapDrawing('ORG', orgOpenCandle.time, prev1614.close, orgOpenCandle.open))
        }
    }

    return { drawings: generated, nextId }
}
