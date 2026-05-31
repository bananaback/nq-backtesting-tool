import { useEffect, useRef, useState } from 'react'
import type { ChartRuntimeState, Drawing, DrawMenuState, OhlcState, Timeframe } from '../chartTypes'
import { createEmptyChartData } from '../chartTypes'
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
    const [ohlc, setOhlc] = useState<OhlcState>({ visible: false })

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

    const updateDrawingLengthMinutes = (drawingId: number, lengthMinutes: number | null) => {
        const nextDrawings = runtimeRef.current.drawings.map((drawing) => {
            if (drawing.id !== drawingId) return drawing
            if (drawing.type !== 'VLINE') {
                return { ...drawing, lengthMinutes }
            }
            return drawing
        })

        runtimeRef.current.drawings = nextDrawings
        setDrawings(nextDrawings)
        drawCanvas()
    }

    useEffect(() => bindTradingChartWindowEvents({
        chartCanvasRef,
        runtimeRef,
        currentTfRef,
        drawModeRef,
        drawMenuOpenRef,
        setDrawMenu,
        drawCanvas,
        resizeCanvas,
        setSelectedDrawingId,
        removeDrawing,
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
        updateDrawingLengthMinutes,
    }
}