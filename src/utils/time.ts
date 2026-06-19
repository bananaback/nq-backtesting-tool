import type { Candle, Timeframe } from '../chartTypes'

export function getTimeframeMinutes(tf: Timeframe) {
    if (tf === 'm1') return 1
    if (tf === 'm5') return 5
    if (tf === 'm15') return 15
    return 60
}

export function roundTimeToTimeframe(timeStr: string, tf: Timeframe): string {
    /** Floors HH:MM time to nearest multiple of timeframe interval in minutes.
    Args:
        timeStr: Time in "HH:MM" 24-hour format (e.g. "09:32", "14:00").
        tf: Timeframe value — 'm1', 'm5', 'm15', or 'h1'.

    Returns:
        Floored time in "HH:MM" format. For 'm1' returns input unchanged.
    */
    const [hoursStr, minutesStr] = timeStr.split(':')
    const hours = Number.parseInt(hoursStr, 10)
    const minutes = Number.parseInt(minutesStr, 10)
    const totalMinutes = hours * 60 + minutes
    const interval = getTimeframeMinutes(tf)
    const flooredMinutes = Math.floor(totalMinutes / interval) * interval
    const flooredHours = Math.floor(flooredMinutes / 60)
    const flooredMins = flooredMinutes % 60
    return `${String(flooredHours).padStart(2, '0')}:${String(flooredMins).padStart(2, '0')}`
}

export function getPreviousDateString(dateStr: string) {
    const date = new Date(`${dateStr}T12:00:00`)
    date.setDate(date.getDate() - 1)
    return date.toISOString().slice(0, 10)
}

export function isMidnightCandle(time: string) {
    const timePart = time.includes(' ') ? time.split(' ')[1] : time.includes('T') ? time.split('T')[1] : time
    return timePart.startsWith('00:00')
}

export function formatObjectTime(time: string) {
    return time.includes(' ') ? time.split(' ')[1] : time
}

export function formatAxisTime(time: string) {
    return time.length >= 16 ? time.substring(5, 16) : time
}

export function getIndexByTime(data: Candle[], timeStr: string) {
    if (!data.length) return -1

    let left = 0
    let right = data.length - 1
    let closest = -1

    while (left <= right) {
        const mid = Math.floor((left + right) / 2)
        if (data[mid].time === timeStr) return mid
        if (data[mid].time < timeStr) {
            closest = mid
            left = mid + 1
        } else {
            right = mid - 1
        }
    }

    return closest
}

export function getFirstIndexByDate(data: Candle[], dateStr: string) {
    return data.findIndex((candle) => candle.time.slice(0, 10) === dateStr)
}
