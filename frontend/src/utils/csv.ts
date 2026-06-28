import type { Candle } from '../chartTypes'

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
