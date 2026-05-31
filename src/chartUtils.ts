import type { Candle, FibDrawing, FibLevel, FibLineStyle, FibTemplateKey, Timeframe, ToolType } from './chartTypes'

function createFibLevels(ratios: number[]) {
    return ratios.map((ratio) => ({
        ratio,
        label: ratio.toString(),
        color: '#000000',
        visible: true,
    }))
}

export const FIB_TEMPLATES: Record<FibTemplateKey, { label: string; levels: FibLevel[] }> = {
    fibo_quadrant: {
        label: 'Fibo Quadrant',
        levels: createFibLevels([0, 0.25, 0.5, 0.75, 1]),
    },
    premium_discount: {
        label: 'Premium Discount Fibo',
        levels: createFibLevels([0, 0.5, 1]),
    },
    ict_ote: {
        label: 'ICT OTE',
        levels: createFibLevels([0, 0.5, 0.62, 0.705, 0.79, 1, -0.27, -0.62, -1]),
    },
    ict_standard_deviation: {
        label: 'ICT Standard Deviation',
        levels: createFibLevels([0, 0.25, 0.5, 0.75, 1, -0.5, -1, -1.5, -2, -2.5]),
    },
}

export function getDefaultFibLevels(templateKey: FibTemplateKey) {
    return FIB_TEMPLATES[templateKey].levels.map((level) => ({ ...level }))
}

export function getFibTemplateLabel(templateKey: FibTemplateKey) {
    return FIB_TEMPLATES[templateKey].label
}

export function getFibLevelPrice(drawing: Pick<FibDrawing, 'price1' | 'price2' | 'reverse'>, ratio: number) {
    if (drawing.reverse) {
        return drawing.price2 + (drawing.price1 - drawing.price2) * ratio
    }
    return drawing.price1 + (drawing.price2 - drawing.price1) * ratio
}

export function getFibLineDash(style: FibLineStyle) {
    if (style === 'dashed') return [8, 4]
    if (style === 'dotted') return [2, 4]
    return []
}

export function snapPriceToCandleOHLC(candle: Candle, price: number) {
    const candidates = [candle.open, candle.high, candle.low, candle.close]
    let best = candidates[0]
    let bestDistance = Math.abs(price - best)

    for (let i = 1; i < candidates.length; i += 1) {
        const distance = Math.abs(price - candidates[i])
        if (distance < bestDistance) {
            best = candidates[i]
            bestDistance = distance
        }
    }

    return best
}

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

export function getTimeframeMinutes(tf: Timeframe) {
    if (tf === 'm1') return 1
    if (tf === 'm5') return 5
    if (tf === 'm15') return 15
    return 60
}

export function getDrawingLengthMinutes(lengthMinutes?: number | null) {
    return lengthMinutes === null || lengthMinutes === undefined ? null : Math.max(0, lengthMinutes)
}

export function getPreviousDateString(dateStr: string) {
    const date = new Date(`${dateStr}T12:00:00`)
    date.setDate(date.getDate() - 1)
    return date.toISOString().slice(0, 10)
}

export function getToolLabel(tool: ToolType) {
    if (tool === 'FVG') return 'Fair Value Gap'
    if (tool === 'FVG_FIRST') return 'First Fair Value Gap'
    if (tool === 'VLINE') return 'Vertical Line'
    if (tool === 'FIB') return 'Fibonacci'
    if (tool === 'OB') return 'Order Block'
    if (tool === 'EQH') return 'Equal Highs'
    if (tool === 'EQL') return 'Equal Lows'
    if (tool === 'SH') return 'Single High'
    if (tool === 'SL') return 'Single Low'
    if (tool === 'NDOG') return 'New Day Opening Gap'
    if (tool === 'NWOG') return 'New Week Opening Gap'
    if (tool === 'ORG_RECENT_5') return 'Draw 5 Most Recent ORG'
    if (tool === 'GAP_RECENT_5') return 'Draw 5 Most Recent NDOG/NWOG'
    return 'Opening Range Gap'
}