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

export type FibTemplateKey = 'fibo_quadrant' | 'premium_discount' | 'ict_ote' | 'ict_standard_deviation'

export type FibLineStyle = 'normal' | 'dashed' | 'dotted'

export type FibLevel = {
    ratio: number
    label: string
    color: string
    visible: boolean
}

export type FibDrawing = {
    id: number
    type: 'FIB'
    time: string
    time2: string
    price1: number
    price2: number
    templateKey: FibTemplateKey
    extendRight: boolean
    reverse: boolean
    lineStyle: FibLineStyle
    lineWidth: number
    levels: FibLevel[]
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
    type: 'OB' | 'EQH' | 'EQL' | 'SH' | 'SL'
    time: string
    price: number
    lengthMinutes?: number | null
    color: string
}

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

export type Drawing = FvgDrawing | LineDrawing | OrgDrawing | VerticalLineDrawing | FibDrawing | EntryDrawing

export type DrawingDraft = Omit<FvgDrawing, 'id'> | Omit<LineDrawing, 'id'> | Omit<OrgDrawing, 'id'> | Omit<VerticalLineDrawing, 'id'> | Omit<FibDrawing, 'id'> | Omit<EntryDrawing, 'id'>

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

export type FibPlacementState = {
    firstPoint: {
        time: string
        price: number
    } | null
    templateKey: FibTemplateKey
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
    pendingFibPlacement: FibPlacementState | null
    pendingEntryPlacement: EntryPlacementState | null
    pendingCandleFilterPick: boolean
    candleFilterMinute: string
    renderAfterFilterMinute: boolean
}
