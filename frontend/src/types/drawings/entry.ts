export type EntryDirection = 'LONG' | 'SHORT'

export type EntryStatus = 'IN_PROGRESS' | 'TP_HIT' | 'SL_HIT'

export type EntryDrawing = {
    id: number
    type: 'ENTRY'
    time: string
    entryPrice: number
    stopLossPrice: number
    takeProfitPrice: number
    direction: EntryDirection
    status: EntryStatus
    widthInCandles: number
    lengthMinutes: number | null
}

export type EntryPlacementState = {
    firstPoint: { time: string; price: number } | null
    secondPoint: { time: string; price: number } | null
    thirdPoint: { time: string; price: number } | null
    fourthPoint: { time: string; price: number } | null
}
