export type LineDrawing = {
    id: number
    type: 'EQH' | 'EQL' | 'SH' | 'SL' | 'PM_HIGH' | 'PM_LOW' | 'LONDON_HIGH' | 'LONDON_LOW' | 'PREV_DAY_PM_HIGH' | 'PREV_DAY_PM_LOW' | 'PREV_DAY_AM_HIGH' | 'PREV_DAY_AM_LOW' | 'ASIAN_HIGH' | 'ASIAN_LOW' | 'OPEN_0000' | 'OPEN_0830' | 'OPEN_0930' | 'PRE_HIGH' | 'PRE_LOW' | 'PREV_DAY_RANGE_HIGH' | 'PREV_DAY_RANGE_LOW' | 'PREV_3DAY_RANGE_HIGH' | 'PREV_3DAY_RANGE_LOW' | 'PREV_DAY_3DAY_RANGE_HIGH' | 'PREV_DAY_3DAY_RANGE_LOW'
    time: string
    price: number
    lengthMinutes?: number | null
    endTime?: string
    breakScanStart?: string
    color: string
}
