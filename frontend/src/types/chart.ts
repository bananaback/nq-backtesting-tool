export type Timeframe = 'm1' | 'm5' | 'm15' | 'h1'

export type ToolType =
    | 'FVG'
    | 'FVG_FIRST'
    | 'VLINE'
    | 'FIB'
    | 'OB'
    | 'EQH'
    | 'EQL'
    | 'SH'
    | 'SL'
    | 'ORG'
    | 'NDOG'
    | 'NWOG'
    | 'ORG_RECENT_5'
    | 'GAP_RECENT_5'
    | 'ENTRY'
    | 'MKT_ANNOT'

export type Candle = {
    time: string
    open: number
    high: number
    low: number
    close: number
}

export type NewsImpact = 'High' | 'Medium' | 'Low' | 'None'

export type NewsEvent = {
    date: string
    time: string
    currency: string
    impact: NewsImpact
    event: string
    sort_key: string
}

export const TIMEFRAMES: Timeframe[] = ['m1', 'm5', 'm15', 'h1']

export const DRAW_TOOL_OPTIONS: ToolType[] = [
    'FVG',
    'FVG_FIRST',
    'VLINE',
    'FIB',
    'OB',
    'EQH',
    'EQL',
    'SH',
    'SL',
    'ORG',
    'NDOG',
    'NWOG',
    'ORG_RECENT_5',
    'GAP_RECENT_5',
    'ENTRY',
    'MKT_ANNOT',
]

export function createEmptyChartData(): Record<Timeframe, Candle[]> {
    return {
        m1: [],
        m5: [],
        m15: [],
        h1: [],
    }
}
