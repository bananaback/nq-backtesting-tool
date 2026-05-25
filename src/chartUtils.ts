import type { Candle, ToolType } from './chartTypes'

export function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
}

export function parseCsvText(text: string) {
    const lines = text.split('\n')
    const candles: Candle[] = []

    for (let i = 1; i < lines.length; i += 1) {
        const line = lines[i].trim()
        if (!line) continue

        const parts = line.split(',')
        if (parts.length < 5) continue

        candles.push({
            time: parts[0],
            open: Number.parseFloat(parts[1]),
            high: Number.parseFloat(parts[2]),
            low: Number.parseFloat(parts[3]),
            close: Number.parseFloat(parts[4]),
        })
    }

    return candles
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

export function getToolLabel(tool: ToolType) {
    if (tool === 'FVG') return 'Fair Value Gap'
    if (tool === 'OB') return 'Order Block'
    if (tool === 'EQH') return 'Equal Highs'
    if (tool === 'EQL') return 'Equal Lows'
    if (tool === 'SH') return 'Single High'
    if (tool === 'SL') return 'Single Low'
    return 'Opening Range Gap'
}