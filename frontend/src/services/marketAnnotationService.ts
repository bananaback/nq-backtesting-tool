import type { Candle, NewsEvent } from '../types/chart'
import type { NewsDrawing } from '../types/drawings/news'
import { findCandleByTime, getFirstIndexByDate } from '../utils/time'

/** Load and parse ff_calendar.json. Returns sorted NewsEvent array.
 *  Cached on first call — subsequent calls return the same data. */
let cachedNewsData: NewsEvent[] | null = null

export async function loadNewsData(): Promise<NewsEvent[]> {
    if (cachedNewsData) return cachedNewsData

    const response = await fetch('/ff_calendar.json')
    if (!response.ok) {
        console.error('Failed to load ff_calendar.json:', response.status)
        return []
    }

    const raw: Array<{
        date: string
        time: string
        currency: string
        impact: string
        event: string
        sort_key: string
    }> = await response.json()

    // Validate and cast
    cachedNewsData = raw.filter(item => {
        return item.date && item.sort_key && item.event
    }) as NewsEvent[]

    return cachedNewsData
}

/** Generate NewsDrawing entries for a given date.
 *  For timed events: finds matching candle via findCandleByTime, creates NEWS drawing.
 *  For "All Day" events: finds first+last candle of day, creates NEWS_ALLDAY with allDayEndTime.
 *  @param events - News events for the date (from findNewsByDateRange).
 *  @param dateStr - Date in "YYYY-MM-DD".
 *  @param data - Candle array for current timeframe.
 *  @param idStart - Starting ID for generated drawings.
 *  @returns Array of NewsDrawing objects. */
export function generateNewsDrawings(
    events: NewsEvent[],
    dateStr: string,
    data: import('../types/chart').Candle[],
    idStart: number,
): NewsDrawing[] {
    const drawings: NewsDrawing[] = []
    let id = idStart

    for (const evt of events) {
        const isHigh = evt.impact === 'High'
        const color = isHigh ? '#ef4444' : '#9ca3af'
        const isAllDay = evt.time === 'All Day'

        if (isAllDay) {
            // Find first candle of date
            const firstIndex = getFirstIndexByDate(data, dateStr)
            if (firstIndex < 0) continue

            // Find last candle of date
            let lastIndex = firstIndex
            for (let i = firstIndex + 1; i < data.length; i++) {
                if (data[i].time.slice(0, 10) === dateStr) {
                    lastIndex = i
                } else {
                    break
                }
            }

            if (firstIndex === lastIndex) {
                // Single candle day — treat as single point
                drawings.push({
                    id: id++,
                    type: 'NEWS',
                    time: data[firstIndex].time,
                    impact: evt.impact,
                    event: evt.event,
                    color,
                })
            } else {
                // Multi-candle day — draw start and end markers
                // Main drawing at first candle
                drawings.push({
                    id: id++,
                    type: 'NEWS_ALLDAY',
                    time: data[firstIndex].time,
                    allDayEndTime: data[lastIndex].time,
                    impact: evt.impact,
                    event: evt.event,
                    color,
                })
            }
        } else {
            // Timed event — find candle by date+time
            const sortKey = evt.sort_key // e.g., "2023-01-03T10:00"
            const candle = findCandleByTime(data, sortKey)
            if (!candle) continue

            drawings.push({
                id: id++,
                type: 'NEWS',
                time: candle.time,
                impact: evt.impact,
                event: evt.event,
                color,
            })
        }
    }

    return drawings
}

export function findTimeByDayAndClock(
    data: Candle[],
    day: string,
    clock: string,
): Candle | null {
    return findCandleByTime(data, day + 'T' + clock)
}
