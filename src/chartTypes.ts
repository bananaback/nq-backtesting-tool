export type Timeframe = 'm1' | 'm5' | 'm15' | 'h1'

export type ToolType =
    | 'FVG'
    | 'FVG_FIRST'
    | 'VLINE'
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

export type Candle = {
    time: string
    open: number
    high: number
    low: number
    close: number
}

export type FvgDrawing = {
    id: number
    type: 'FVG'
    time: string
    top: number
    bot: number
    lengthMinutes?: number | null
    color: string
    border: string
}

export type VerticalLineDrawing = {
    id: number
    type: 'VLINE'
    time: string
    color: string
}

export type OrgDrawing = {
    id: number
    type: 'ORG' | 'NDOG' | 'NWOG'
    time: string
    top: number
    bot: number
    price1614: number
    price0930: number
    lengthMinutes?: number | null
    fillColor?: string
    borderColor?: string
}

export type LineDrawing = {
    id: number
    type: Exclude<ToolType, 'FVG' | 'ORG' | 'NDOG' | 'NWOG' | 'VLINE' | 'FVG_FIRST' | 'ORG_RECENT_5' | 'GAP_RECENT_5'>
    time: string
    price: number
    lengthMinutes?: number | null
    color: string
}

export type Drawing = FvgDrawing | LineDrawing | OrgDrawing | VerticalLineDrawing

export type DrawingDraft = Omit<FvgDrawing, 'id'> | Omit<LineDrawing, 'id'> | Omit<OrgDrawing, 'id'> | Omit<VerticalLineDrawing, 'id'>

export type DrawMenuState =
    | {
        x: number
        y: number
    }
    | null

export type OhlcState =
    | {
        visible: true
        time: string
        open: number
        high: number
        low: number
        close: number
        bullish: boolean
    }
    | { visible: false }

export const TIMEFRAMES: Timeframe[] = ['m1', 'm5', 'm15', 'h1']

export const DRAW_TOOL_OPTIONS: ToolType[] = [
    'FVG',
    'FVG_FIRST',
    'VLINE',
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
]

export function createEmptyChartData(): Record<Timeframe, Candle[]> {
    return {
        m1: [],
        m5: [],
        m15: [],
        h1: [],
    }
}

export type ChartRuntimeState = {
    chartData: Record<Timeframe, Candle[]>
    sourceFiles: Partial<Record<Timeframe, File>>
    showDaySeparators: boolean
    drawings: Drawing[]
    drawingIdCounter: number
    viewStart: number
    visibleCount: number
    isAutoScaled: boolean
    manualMaxP: number
    manualMinP: number
    crosshairActive: boolean
    crosshairX: number
    crosshairY: number
    selectedCandleIndex: number | null
    selectedDrawingId: number | null
    mouseDownX: number
    mouseDownY: number
    isDraggingChart: boolean
    isDraggingAxis: boolean
    lastX: number
    lastY: number
}