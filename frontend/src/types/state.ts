import type { Candle, NewsEvent, Timeframe } from './chart'
import type { Drawing } from './drawings/index'
import type { FibTemplateKey } from './drawings/fib'
import type { EntryPlacementState } from './drawings/entry'

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
    newsData: NewsEvent[]
    hoveredNews: NewsEvent | null
    showNews: boolean
}
