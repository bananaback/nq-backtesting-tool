import type { Candle, EntryDirection, EntryDrawing, EntryStatus, FibDrawing, FibLineStyle } from '../types/chart'

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

export function getEntryRR(drawing: Pick<EntryDrawing, 'entryPrice' | 'stopLossPrice' | 'takeProfitPrice'>): number {
    const risk = Math.abs(drawing.entryPrice - drawing.stopLossPrice)
    const reward = Math.abs(drawing.takeProfitPrice - drawing.entryPrice)
    return risk === 0 ? 0 : reward / risk
}

export function computeEntryStatus(
    data: Candle[],
    entryIndex: number,
    widthInCandles: number,
    direction: EntryDirection,
    stopLossPrice: number,
    takeProfitPrice: number
): EntryStatus {
    if (widthInCandles <= 0 || entryIndex < 0 || entryIndex >= data.length) {
        return 'IN_PROGRESS'
    }

    const endIndex = Math.min(entryIndex + widthInCandles, data.length - 1)

    for (let i = entryIndex + 1; i <= endIndex; i++) {
        const candle = data[i]

        if (direction === 'LONG') {
            if (candle.low <= stopLossPrice) {
                return 'SL_HIT'
            }
            if (candle.high >= takeProfitPrice) {
                return 'TP_HIT'
            }
        } else {
            if (candle.high >= stopLossPrice) {
                return 'SL_HIT'
            }
            if (candle.low <= takeProfitPrice) {
                return 'TP_HIT'
            }
        }
    }

    return 'IN_PROGRESS'
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

export function getDrawingLengthMinutes(lengthMinutes?: number | null) {
    return lengthMinutes === null || lengthMinutes === undefined ? null : Math.max(0, lengthMinutes)
}
