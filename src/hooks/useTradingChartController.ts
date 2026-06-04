import { useEffect, useRef, useState } from 'react'
import type { ChartRuntimeState, Drawing, DrawMenuState, OhlcState, Timeframe } from '../chartTypes'
import { createEmptyChartData } from '../chartTypes'
import { computeEntryStatus, getIndexByTime, getTimeframeMinutes } from '../chartUtils'
import { drawTradingChart } from '../chartRender'
import { resizeTradingChart } from '../chartResize'
import { createTradingChartActions } from './useTradingChartActions'
import { bindTradingChartWindowEvents } from './useTradingChartWindow'

export function useTradingChartController() {
    const chartCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const yAxisCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const xAxisCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const chartStageRef = useRef<HTMLDivElement | null>(null)

    const runtimeRef = useRef<ChartRuntimeState>({
        chartData: createEmptyChartData(),
        sourceFiles: {},
        showDaySeparators: true,
        drawings: [],
        drawingIdCounter: 1,
        viewStart: 0,
        visibleCount: 100,
        isAutoScaled: true,
        manualMaxP: 0,
        manualMinP: 0,
        crosshairActive: false,
        crosshairX: 0,
        crosshairY: 0,
        selectedCandleIndex: null,
        selectedDrawingId: null,
        mouseDownX: 0,
        mouseDownY: 0,
        isDraggingChart: false,
        isDraggingAxis: false,
        lastX: 0,
        lastY: 0,
        pendingFibPlacement: null,
        pendingEntryPlacement: null,
        pendingCandleFilterPick: false,
        candleFilterMinute: '',
        renderAfterFilterMinute: true,
    })

    const currentTfRef = useRef<Timeframe>('m1')
    const drawModeRef = useRef(false)
    const drawMenuOpenRef = useRef(false)
    const showDaySeparatorsRef = useRef(true)

    const [currentTF, setCurrentTF] = useState<Timeframe>('m1')
    const [jumpDate, setJumpDate] = useState('')
    const [drawMode, setDrawMode] = useState(false)
    const [showDaySeparators, setShowDaySeparators] = useState(true)
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

    const shiftCandleFilterMinute = (deltaMinutes: number) => {
        if (!candleFilterMinute) return
        const base = new Date(candleFilterMinute)
        if (Number.isNaN(base.getTime())) return
        const stepMinutes = getTimeframeMinutes(currentTF)
        base.setMinutes(base.getMinutes() + deltaMinutes * stepMinutes)
        const nextValue = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}T${String(base.getHours()).padStart(2, '0')}:${String(base.getMinutes()).padStart(2, '0')}`
        setCandleFilterMinute(nextValue)
    }

    const startCandleFilterPick = () => {
        runtimeRef.current.pendingCandleFilterPick = true
        setIsPickingCandleFilter(true)
        drawCanvas()
    }

    const drawCanvas = () => {
        const chartCanvas = chartCanvasRef.current
        const yAxisCanvas = yAxisCanvasRef.current
        const xAxisCanvas = xAxisCanvasRef.current
        if (!chartCanvas || !yAxisCanvas || !xAxisCanvas) return

        drawTradingChart({
            chartCanvas,
            yAxisCanvas,
            xAxisCanvas,
            runtime: runtimeRef.current,
            currentTF: currentTfRef.current,
            drawMenuOpen: drawMenuOpenRef.current,
            setOhlc,
        })
    }

    const resizeCanvas = () => {
        const chartCanvas = chartCanvasRef.current
        const yAxisCanvas = yAxisCanvasRef.current
        const xAxisCanvas = xAxisCanvasRef.current
        const chartStage = chartStageRef.current
        if (!chartCanvas || !yAxisCanvas || !xAxisCanvas || !chartStage) return

        resizeTradingChart({ chartCanvas, yAxisCanvas, xAxisCanvas, chartStage, drawChart: drawCanvas })
    }

    const {
        changeTimeframe,
        jumpToDate,
        toggleDrawMode,
        toggleDaySeparators,
        loadCsvFiles,
        removeDrawing,
        createDrawing,
        handleChartMouseDown,
        handleChartWheel,
        handleChartMouseLeave,
        handleYAxisMouseDown,
        handleYAxisDoubleClick,
    } = createTradingChartActions({
        chartCanvasRef,
        runtimeRef,
        currentTfRef,
        drawModeRef,
        showDaySeparatorsRef,
        drawMenuOpenRef,
        setCurrentTF,
        setJumpDate,
        setDrawMode,
        setShowDaySeparators,
        setDrawMenu,
        setDrawings,
        setSelectedDrawingId,
        setFibPlacementStep,
        setEntryPlacementStep,
        drawCanvas,
    })

    useEffect(() => {
        currentTfRef.current = currentTF
        drawCanvas()
    }, [currentTF])

    useEffect(() => {
        drawModeRef.current = drawMode
    }, [drawMode])

    useEffect(() => {
        showDaySeparatorsRef.current = showDaySeparators
        runtimeRef.current.showDaySeparators = showDaySeparators
        drawCanvas()
    }, [showDaySeparators])

    useEffect(() => {
        drawMenuOpenRef.current = drawMenu !== null
        drawCanvas()
    }, [drawMenu])

    useEffect(() => {
        runtimeRef.current.drawings = drawings
        drawCanvas()
    }, [drawings, objectsOpen])

    useEffect(() => {
        runtimeRef.current.selectedDrawingId = selectedDrawingId
        drawCanvas()
    }, [selectedDrawingId])

    useEffect(() => {
        runtimeRef.current.candleFilterMinute = candleFilterMinute
        drawCanvas()
    }, [candleFilterMinute])

    useEffect(() => {
        runtimeRef.current.renderAfterFilterMinute = renderAfterFilterMinute
        drawCanvas()
    }, [renderAfterFilterMinute])

    useEffect(() => {
        runtimeRef.current.pendingCandleFilterPick = isPickingCandleFilter
        drawCanvas()
    }, [isPickingCandleFilter])

    const updateDrawingLengthMinutes = (drawingId: number, lengthMinutes: number | null) => {
        const nextDrawings = runtimeRef.current.drawings.map((drawing) => {
            if (drawing.id !== drawingId) return drawing

            if (drawing.type === 'VLINE' || drawing.type === 'FIB') {
                return drawing
            }

            if (drawing.type === 'ENTRY') {
                if (lengthMinutes === null) return drawing
                const timeframeMinutes = getTimeframeMinutes(currentTfRef.current)
                const widthInCandles = Math.max(1, Math.round(lengthMinutes / timeframeMinutes))
                const entryIndex = getIndexByTime(runtimeRef.current.chartData[currentTfRef.current], drawing.time)
                const status = computeEntryStatus(
                    runtimeRef.current.chartData[currentTfRef.current],
                    entryIndex,
                    widthInCandles,
                    drawing.direction,
                    drawing.stopLossPrice,
                    drawing.takeProfitPrice
                )
                return { ...drawing, widthInCandles, lengthMinutes, status }
            }

            return { ...drawing, lengthMinutes }
        })

        runtimeRef.current.drawings = nextDrawings
        setDrawings(nextDrawings)
        drawCanvas()
    }

    const updateFibDrawing = (drawingId: number, updates: Partial<Extract<Drawing, { type: 'FIB' }>>) => {
        const nextDrawings = runtimeRef.current.drawings.map((drawing) => {
            if (drawing.id !== drawingId || drawing.type !== 'FIB') return drawing
            return { ...drawing, ...updates }
        })

        runtimeRef.current.drawings = nextDrawings
        setDrawings(nextDrawings)
        drawCanvas()
    }

    const cancelFibPlacement = () => {
        runtimeRef.current.pendingFibPlacement = null
        setFibPlacementStep(null)
        drawMenuOpenRef.current = false
        setDrawMenu(null)
        drawCanvas()
    }

    const cancelEntryPlacement = () => {
        runtimeRef.current.pendingEntryPlacement = null
        setEntryPlacementStep(null)
        drawMenuOpenRef.current = false
        setDrawMenu(null)
        drawCanvas()
    }

    useEffect(() => bindTradingChartWindowEvents({
        chartCanvasRef,
        runtimeRef,
        currentTfRef,
        drawModeRef,
        drawMenuOpenRef,
        setDrawMenu,
        setDrawings,
        drawCanvas,
        resizeCanvas,
        setSelectedDrawingId,
        setFibPlacementStep,
        cancelFibPlacement,
        setEntryPlacementStep,
        cancelEntryPlacement,
        removeDrawing,
        setCandleFilterMinute,
        setRenderAfterFilterMinute,
        setIsPickingCandleFilter,
    }), [])

    return {
        chartCanvasRef,
        yAxisCanvasRef,
        xAxisCanvasRef,
        chartStageRef,
        currentTF,
        jumpDate,
        drawMode,
        showDaySeparators,
        objectsOpen,
        drawMenu,
        drawings,
        ohlc,
        changeTimeframe,
        jumpToDate,
        setJumpDate,
        toggleDrawMode,
        toggleDaySeparators,
        setObjectsOpen,
        loadCsvFiles,
        removeDrawing,
        createDrawing,
        handleChartMouseDown,
        handleChartWheel,
        handleChartMouseLeave,
        handleYAxisMouseDown,
        handleYAxisDoubleClick,
        selectedDrawingId,
        setSelectedDrawingId,
        lengthEditorDrawingId,
        setLengthEditorDrawingId,
        fibSetupDrawingId,
        setFibSetupDrawingId,
        fibPlacementStep,
        cancelFibPlacement,
        entryPlacementStep,
        cancelEntryPlacement,
        updateDrawingLengthMinutes,
        updateFibDrawing,
        candleFilterMinute,
        setCandleFilterMinute,
        renderAfterFilterMinute,
        setRenderAfterFilterMinute,
        shiftCandleFilterMinute,
        isPickingCandleFilter,
        startCandleFilterPick,
    }
}