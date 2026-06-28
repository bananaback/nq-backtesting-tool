import type { Dispatch, SetStateAction } from 'react'
import type { Candle } from '../types/chart'
import type { ChartRuntimeState } from '../types/state'
import type { Drawing, DrawingDraft } from '../types/drawings/index'
import { getPreviousDateString } from '../utils/time'
import { findTimeByDayAndClock } from './marketAnnotationService'

export function findPreviousClockClose(data: Candle[], beforeIndex: number, clock: string): Candle | null {
    for (let i = beforeIndex - 1; i >= 0; i -= 1) {
        if (data[i].time.includes(clock)) return data[i]
    }
    return null
}

export function findPriorClockAcrossDays(
    data: Candle[],
    startDay: string,
    clock: string,
): { day: string; candle: Candle } | null {
    let day = startDay
    let iterations = 0
    while (iterations < 7) {
        const candle = findTimeByDayAndClock(data, day, clock)
        if (candle) return { day, candle }

        const previousDay = getPreviousDateString(day)
        if (previousDay === day) return null
        day = previousDay
        iterations += 1
    }
    return null
}

export function findSessionOpenOnPreviousDay(data: Candle[], selectedDay: string): Candle | null {
    const previousDay = getPreviousDateString(selectedDay)
    for (let i = 0; i < data.length; i += 1) {
        if (!data[i].time.startsWith(previousDay)) continue
        const timePart = data[i].time.includes(' ')
            ? data[i].time.split(' ')[1]
            : data[i].time.includes('T')
                ? data[i].time.split('T')[1]
                : ''
        if (timePart.startsWith('18:00')) return data[i]
    }
    return null
}

export function buildSessionGapDrawing(
    type: 'ORG' | 'NDOG' | 'NWOG',
    gapTime: string,
    prevClose: number,
    sessionOpen: number,
): DrawingDraft {
    const top = Math.max(prevClose, sessionOpen)
    const bot = Math.min(prevClose, sessionOpen)

    if (type === 'ORG') {
        return {
            type,
            time: gapTime,
            top,
            bot,
            lengthMinutes: null,
            price1614: prevClose,
            price0930: sessionOpen,
        }
    }

    const fill = type === 'NDOG' ? 'rgba(59, 130, 246, 0.14)' : 'rgba(168, 85, 247, 0.14)'
    const border = type === 'NDOG' ? 'rgba(59, 130, 246, 0.65)' : 'rgba(168, 85, 247, 0.72)'

    return {
        type,
        time: gapTime,
        top,
        bot,
        lengthMinutes: null,
        price1614: prevClose,
        price0930: sessionOpen,
        fillColor: fill,
        borderColor: border,
    } as DrawingDraft
}

export function listAvailableDaysUntil(data: Candle[], endDay: string): string[] {
    const days: string[] = []
    let lastDay = ''
    for (let i = 0; i < data.length; i += 1) {
        const day = data[i].time.slice(0, 10)
        if (day > endDay) continue
        if (day !== lastDay) {
            days.push(day)
            lastDay = day
        }
    }
    return days
}

export function handleRecentGapDrawings(
    type: 'ORG_RECENT_5' | 'GAP_RECENT_5',
    runtime: ChartRuntimeState,
    candle: Candle,
    setDrawings: Dispatch<SetStateAction<Drawing[]>>,
): void {
    const m1Data = runtime.chartData.m1
    if (!m1Data || m1Data.length === 0) {
        window.alert('Load M1 data first to calculate recent gaps.')
        return
    }

    const selectedDay = candle.time.slice(0, 10)
    const availableDays = listAvailableDaysUntil(m1Data, selectedDay)
    const generated: DrawingDraft[] = []

    for (let i = availableDays.length - 1; i >= 0 && generated.length < 5; i -= 1) {
        const day = availableDays[i]

        if (type === 'ORG_RECENT_5') {
            const openCandle = findTimeByDayAndClock(m1Data, day, '09:30')
            if (!openCandle) continue
            const prev1614Close = findPreviousClockClose(m1Data, m1Data.indexOf(openCandle), '16:14')
            if (!prev1614Close) continue
            generated.push(buildSessionGapDrawing('ORG', openCandle.time, prev1614Close.close, openCandle.open))
        } else {
            const dow = new Date(`${day}T12:00:00`).getDay()
            const effectiveType: 'NDOG' | 'NWOG' = dow === 0 || dow === 1 ? 'NWOG' : 'NDOG'
            const openDay = getPreviousDateString(day)
            const openCandle = findSessionOpenOnPreviousDay(m1Data, day)
            if (!openCandle) continue
            const priorClose = findPriorClockAcrossDays(m1Data, openDay, '16:14')
            if (!priorClose) continue
            generated.push(buildSessionGapDrawing(effectiveType, openCandle.time, priorClose.candle.close, openCandle.open))
        }
    }

    if (generated.length > 0) {
        const nextDrawings = [
            ...runtime.drawings,
            ...generated.map((item, offset) => ({ ...item, id: runtime.drawingIdCounter + offset })) as Drawing[],
        ]
        runtime.drawingIdCounter += generated.length
        runtime.drawings = nextDrawings
        setDrawings(nextDrawings)

        const label = type === 'ORG_RECENT_5' ? 'ORG' : 'NDOG/NWOG'
        window.alert(`Added ${generated.length} recent ${label} gap(s) to the object list.`)
    } else {
        const label = type === 'ORG_RECENT_5' ? 'ORG' : 'NDOG/NWOG'
        window.alert(`No recent ${label} gap could be calculated from current data.`)
    }
}
