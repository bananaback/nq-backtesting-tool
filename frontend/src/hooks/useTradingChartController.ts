import { useEffect, useState } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { Timeframe, ToolType } from '../types/chart'
import type { ChartRuntimeState, DrawMenuState, OhlcState } from '../types/state'
import type { Drawing } from '../types/drawings/index'
import type { MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from 'react'
import { useChartRuntime } from './useChartRuntime'
import { useChartEngine } from './useChartEngine'
import { useChartAutomation } from './useAutomation'
import { createTradingChartActions } from './useTradingChartActions'
import { bindTradingChartWindowEvents } from './useTradingChartWindow'
import { loadNewsData } from '../services/marketAnnotationService'
import { createCandleFilter } from './useCandleFilter'
import { createDrawingMutations } from './useDrawingMutations'
import { createMarketAnnotationActions } from './useMarketAnnotationActions'

type UseTradingChartControllerReturn = {
    chartCanvasRef: RefObject<HTMLCanvasElement | null>
    yAxisCanvasRef: RefObject<HTMLCanvasElement | null>
    xAxisCanvasRef: RefObject<HTMLCanvasElement | null>
    chartStageRef: RefObject<HTMLDivElement | null>
    currentTF: Timeframe
    jumpDate: string
    drawMode: boolean
    showDaySeparators: boolean
    showNews: boolean
    objectsOpen: boolean
    drawMenu: DrawMenuState
    drawings: Drawing[]
    ohlc: OhlcState
    changeTimeframe: (tf: Timeframe) => void
    jumpToDate: (date: string) => void
    jumpToMinute: (minuteStr: string) => void
    jumpToLastCandleOfDate: (dateStr: string) => void
    jumpToLatest: () => void
    setJumpDate: Dispatch<SetStateAction<string>>
    toggleDrawMode: () => void
    toggleDaySeparators: () => void
    toggleNews: () => void
    setObjectsOpen: Dispatch<SetStateAction<boolean>>
    loadCsvFiles: (files: FileList | null) => void
    removeDrawing: (id: number) => void
    createDrawing: (type: ToolType) => void
    handleChartMouseDown: (event: ReactMouseEvent<HTMLCanvasElement>) => void
    handleChartWheel: (event: ReactWheelEvent<HTMLCanvasElement>) => void
    handleChartMouseLeave: () => void
    handleYAxisMouseDown: (event: ReactMouseEvent<HTMLCanvasElement>) => void
    handleYAxisDoubleClick: () => void
    handleYAxisWheel: (event: ReactWheelEvent<HTMLCanvasElement>) => void
    selectedDrawingId: number | null
    setSelectedDrawingId: Dispatch<SetStateAction<number | null>>
    lengthEditorDrawingId: number | null
    setLengthEditorDrawingId: Dispatch<SetStateAction<number | null>>
    fibSetupDrawingId: number | null
    setFibSetupDrawingId: Dispatch<SetStateAction<number | null>>
    fibPlacementStep: 'pick-first' | 'pick-second' | null
    cancelFibPlacement: () => void
    entryPlacementStep: 'pick-entry' | 'pick-sl' | 'pick-tp' | 'pick-width' | null
    cancelEntryPlacement: () => void
    updateDrawingLengthMinutes: (drawingId: number, lengthMinutes: number | null) => void
    updateFibDrawing: (drawingId: number, updates: Partial<Extract<Drawing, { type: 'FIB' }>>) => void
    candleFilterMinute: string
    setCandleFilterMinute: Dispatch<SetStateAction<string>>
    renderAfterFilterMinute: boolean
    setRenderAfterFilterMinute: Dispatch<SetStateAction<boolean>>
    shiftCandleFilterMinute: (deltaMinutes: number) => void
    isPickingCandleFilter: boolean
    startCandleFilterPick: () => void
    addBacktestSection: (dateStr: string, timeStr: string) => Promise<boolean>
    exitFullscreenRef: RefObject<(() => void) | null>
    onHideTopBarRef: RefObject<(() => void) | null>
    mktAnnotDialogOpen: boolean
    chartLoading: boolean
    confirmMarketAnnotations: (dateStr: string) => void
    closeMktAnnotDialog: () => void
    prepareDayView: (dateStr: string) => Promise<void>
    exportAllDays: () => Promise<void>
}

/** Main trading chart controller. Composes sub-hooks for state, actions, events. */
export function useTradingChartController(): UseTradingChartControllerReturn {
    const engine = useChartEngine()
    const {
        runtimeRef, currentTfRef, drawModeRef, showDaySeparatorsRef, drawMenuOpenRef,
        exitFullscreenRef, onHideTopBarRef,
    } = useChartRuntime()

    const [currentTF, setCurrentTF] = useState<Timeframe>('m1')
    const [jumpDate, setJumpDate] = useState('')
    const [drawMode, setDrawMode] = useState(false)
    const [showDaySeparators, setShowDaySeparators] = useState(true)
    const [showNews, setShowNews] = useState(true)
    const [objectsOpen, setObjectsOpen] = useState(false)
    const [drawMenu, setDrawMenu] = useState<DrawMenuState>(null)
    const [drawings, setDrawings] = useState<Drawing[]>([])
    const [selectedDrawingId, setSelectedDrawingId] = useState<number | null>(null)
    const [lengthEditorDrawingId, setLengthEditorDrawingId] = useState<number | null>(null)
    const [fibSetupDrawingId, setFibSetupDrawingId] = useState<number | null>(null)
    const [fibPlacementStep, setFibPlacementStep] = useState<'pick-first' | 'pick-second' | null>(null)
    const [entryPlacementStep, setEntryPlacementStep] = useState<'pick-entry' | 'pick-sl' | 'pick-tp' | 'pick-width' | null>(null)
    const [ohlc, setOhlc] = useState<OhlcState>({ visible: false })
    const [candleFilterMinute, setCandleFilterMinute] = useState('')
    const [renderAfterFilterMinute, setRenderAfterFilterMinute] = useState(true)
    const [isPickingCandleFilter, setIsPickingCandleFilter] = useState(false)
    const [mktAnnotDialogOpen, setMktAnnotDialogOpen] = useState(false)
    const [chartLoading, setChartLoading] = useState(false)

    const drawCanvas = () => engine.drawCanvas(runtimeRef, currentTfRef, drawMenuOpenRef, setOhlc)
    const resizeCanvas = () => engine.resizeCanvas(runtimeRef, currentTfRef, drawMenuOpenRef, setOhlc)

    const { shiftCandleFilterMinute, startCandleFilterPick } = createCandleFilter({
        candleFilterMinute, setCandleFilterMinute, currentTF, runtimeRef,
        setIsPickingCandleFilter, drawCanvas,
    })

    const actions = createTradingChartActions({
        chartCanvasRef: engine.chartCanvasRef,
        yAxisCanvasRef: engine.yAxisCanvasRef,
        xAxisCanvasRef: engine.xAxisCanvasRef,
        runtimeRef, currentTfRef, drawModeRef, showDaySeparatorsRef, drawMenuOpenRef,
        setCurrentTF, setJumpDate, setDrawMode, setShowDaySeparators, setShowNews,
        setDrawMenu, setDrawings, setSelectedDrawingId,
        setFibPlacementStep, setEntryPlacementStep,
        setCandleFilterMinute, setRenderAfterFilterMinute,
        setMktAnnotDialogOpen,
        onHideTopBar: () => onHideTopBarRef.current?.(),
        setChartLoading,
        drawCanvas,
    })

    const {
        updateDrawingLengthMinutes, updateFibDrawing, cancelFibPlacement, cancelEntryPlacement,
    } = createDrawingMutations({
        runtimeRef, currentTfRef, setDrawings, drawCanvas,
        setFibPlacementStep, setEntryPlacementStep, drawMenuOpenRef, setDrawMenu,
    })

    const { confirmMarketAnnotations, closeMktAnnotDialog } = createMarketAnnotationActions({
        runtimeRef, currentTfRef, setDrawings, setMktAnnotDialogOpen, drawCanvas,
    })

    useChartAutomation(
        engine.chartCanvasRef, engine.yAxisCanvasRef, engine.xAxisCanvasRef,
        runtimeRef, drawCanvas, actions.prepareDayView,
    )

    useEffect(() => { currentTfRef.current = currentTF; drawCanvas() }, [currentTF])
    useEffect(() => { drawModeRef.current = drawMode }, [drawMode])
    useEffect(() => {
        loadNewsData().then(data => { runtimeRef.current.newsData = data })
            .catch(err => { console.error('Failed to preload news data:', err) })
    }, [])
    useEffect(() => {
        showDaySeparatorsRef.current = showDaySeparators
        runtimeRef.current.showDaySeparators = showDaySeparators
        drawCanvas()
    }, [showDaySeparators])
    useEffect(() => { drawMenuOpenRef.current = drawMenu !== null; drawCanvas() }, [drawMenu])
    useEffect(() => { runtimeRef.current.drawings = drawings; drawCanvas() }, [drawings, objectsOpen])
    useEffect(() => { runtimeRef.current.selectedDrawingId = selectedDrawingId; drawCanvas() }, [selectedDrawingId])
    useEffect(() => { runtimeRef.current.candleFilterMinute = candleFilterMinute; drawCanvas() }, [candleFilterMinute])
    useEffect(() => { runtimeRef.current.renderAfterFilterMinute = renderAfterFilterMinute; drawCanvas() }, [renderAfterFilterMinute])
    useEffect(() => { runtimeRef.current.pendingCandleFilterPick = isPickingCandleFilter; drawCanvas() }, [isPickingCandleFilter])

    useEffect(() => bindTradingChartWindowEvents({
        chartCanvasRef: engine.chartCanvasRef,
        yAxisCanvasRef: engine.yAxisCanvasRef,
        xAxisCanvasRef: engine.xAxisCanvasRef,
        runtimeRef, currentTfRef, drawModeRef, drawMenuOpenRef,
        setDrawMenu, setDrawings,
        drawCanvas, resizeCanvas,
        setSelectedDrawingId, setFibPlacementStep, cancelFibPlacement,
        setEntryPlacementStep, cancelEntryPlacement,
        removeDrawing: actions.removeDrawing,
        setCandleFilterMinute, setRenderAfterFilterMinute, setIsPickingCandleFilter,
        toggleDrawMode: actions.toggleDrawMode,
        exitFullscreenRef,
    }), [])

    return {
        chartCanvasRef: engine.chartCanvasRef,
        yAxisCanvasRef: engine.yAxisCanvasRef,
        xAxisCanvasRef: engine.xAxisCanvasRef,
        chartStageRef: engine.chartStageRef,
        currentTF, jumpDate, drawMode, showDaySeparators, showNews, objectsOpen,
        drawMenu, drawings, ohlc,
        ...actions,
        setJumpDate, setObjectsOpen,
        selectedDrawingId, setSelectedDrawingId,
        lengthEditorDrawingId, setLengthEditorDrawingId,
        fibSetupDrawingId, setFibSetupDrawingId,
        fibPlacementStep, cancelFibPlacement,
        entryPlacementStep, cancelEntryPlacement,
        updateDrawingLengthMinutes, updateFibDrawing,
        candleFilterMinute, setCandleFilterMinute,
        renderAfterFilterMinute, setRenderAfterFilterMinute,
        shiftCandleFilterMinute, isPickingCandleFilter, startCandleFilterPick,
        exitFullscreenRef, onHideTopBarRef, mktAnnotDialogOpen, chartLoading,
        confirmMarketAnnotations, closeMktAnnotDialog,
    }
}
