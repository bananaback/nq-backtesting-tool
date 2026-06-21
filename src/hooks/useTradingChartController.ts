import { useEffect, useRef, useState } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { ChartRuntimeState, Drawing, DrawMenuState, OhlcState, Timeframe, ToolType } from '../chartTypes'
import type { MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from 'react'
import { createEmptyChartData } from '../chartTypes'
import { computeEntryStatus, getIndexByTime, getTimeframeMinutes } from '../chartUtils'
import { drawTradingChart } from '../chartRender'
import { resizeTradingChart } from '../chartResize'
import { createTradingChartActions } from './useTradingChartActions'
import { bindTradingChartWindowEvents } from './useTradingChartWindow'
import { loadNewsData, generateNewsDrawings } from '../services/marketAnnotationService'
import { findNewsByDateRange } from '../utils/time'

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

/** Main trading chart controller hook.
 *
 * Manages canvas refs, chart state, drawing/placement state, and return an
 * object of refs, state values, setters, and action handlers for composing
 * the trading chart UI.
 *
 * Returns:
 *     Controller object with refs, state, setters, and action handlers.
 */
export function useTradingChartController(): UseTradingChartControllerReturn {
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
        newsData: [],
        hoveredNews: null,
        showNews: true,
    })

    const currentTfRef = useRef<Timeframe>('m1')
    const drawModeRef = useRef(false)
    const drawMenuOpenRef = useRef(false)
    const showDaySeparatorsRef = useRef(true)
    const exitFullscreenRef = useRef<(() => void) | null>(null)
    const onHideTopBarRef = useRef<(() => void) | null>(null)

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
        jumpToLatest,
        jumpToMinute,
        jumpToLastCandleOfDate,
        toggleDrawMode,
        toggleDaySeparators,
        toggleNews,
        loadCsvFiles,
        removeDrawing,
        createDrawing,
        handleChartMouseDown,
        handleChartWheel,
        handleChartMouseLeave,
        handleYAxisMouseDown,
        handleYAxisDoubleClick,
        handleYAxisWheel,
        addBacktestSection,
        prepareDayView,
        exportAllDays,
    } = createTradingChartActions({
        chartCanvasRef,
        yAxisCanvasRef,
        xAxisCanvasRef,
        runtimeRef,
        currentTfRef,
        drawModeRef,
        showDaySeparatorsRef,
        drawMenuOpenRef,
        setCurrentTF,
        setJumpDate,
        setDrawMode,
        setShowDaySeparators,
        setShowNews,
        setDrawMenu,
        setDrawings,
        setSelectedDrawingId,
        setFibPlacementStep,
        setEntryPlacementStep,
        setCandleFilterMinute,
        setRenderAfterFilterMinute,
        setMktAnnotDialogOpen,
        onHideTopBar: () => onHideTopBarRef.current?.(),
        setChartLoading,
        drawCanvas,
    })

    useEffect(() => {
        currentTfRef.current = currentTF
        drawCanvas()
    }, [currentTF])

    useEffect(() => {
        drawModeRef.current = drawMode
    }, [drawMode])

    // Load news data on mount
    useEffect(() => {
        loadNewsData().then(data => {
            runtimeRef.current.newsData = data
        }).catch(err => {
            console.error('Failed to preload news data:', err)
        })
    }, [])

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

    // Expose functions on window for automation scripts
    useEffect(() => {
        const w = window as unknown as {
            __chartAPI?: {
                prepareDayView: (dateStr: string) => Promise<void>
                captureChartAsBlob: () => Promise<Blob | null>
                getAllDates: () => string[]
            }
        }
        w.__chartAPI = {
            prepareDayView,
            captureChartAsBlob: () => new Promise<Blob | null>((resolve) => {
                const chartCanvas = chartCanvasRef.current
                const yAxisCanvas = yAxisCanvasRef.current
                const xAxisCanvas = xAxisCanvasRef.current
                if (!chartCanvas || !yAxisCanvas || !xAxisCanvas) {
                    resolve(null)
                    return
                }
                // Temporarily hide crosshair
                const hadCrosshair = runtimeRef.current.crosshairActive
                runtimeRef.current.crosshairActive = false
                drawCanvas()

                // Wait for render, then capture
                requestAnimationFrame(() => {
                    const width = chartCanvas.width + yAxisCanvas.width
                    const height = chartCanvas.height + xAxisCanvas.height
                    const offscreen = document.createElement('canvas')
                    offscreen.width = width
                    offscreen.height = height
                    const ctx = offscreen.getContext('2d')
                    if (!ctx) {
                        resolve(null)
                        return
                    }
                    ctx.drawImage(chartCanvas, 0, 0)
                    ctx.drawImage(yAxisCanvas, chartCanvas.width, 0)
                    ctx.drawImage(xAxisCanvas, 0, chartCanvas.height)

                    // Restore crosshair
                    if (hadCrosshair) {
                        runtimeRef.current.crosshairActive = true
                        drawCanvas()
                    }

                    offscreen.toBlob(resolve, 'image/png')
                })
            }),
            getAllDates: () => {
                const data = runtimeRef.current.chartData.m1
                const dates = new Set<string>()
                for (const candle of data) {
                    dates.add(candle.time.slice(0, 10))
                }
                return Array.from(dates).sort()
            },
        }
        return () => {
            delete w.__chartAPI
        }
    }, [prepareDayView, chartCanvasRef, yAxisCanvasRef, xAxisCanvasRef, runtimeRef, drawCanvas])

    const confirmMarketAnnotations = async (dateStr: string) => {
        const runtime = runtimeRef.current
        const data = runtime.chartData[currentTfRef.current]

        if (!data.length) {
            window.alert('Load chart data before adding news annotations.')
            return
        }

        // Load news data (cached internally by loadNewsData)
        const allNews = await loadNewsData()
        if (!allNews.length) {
            window.alert('No news data available. Ensure ff_calendar.json is present in the public folder.')
            return
        }

        // Store in runtime for future use
        runtime.newsData = allNews

        // Find news for the selected date using binary search
        const dateNews = findNewsByDateRange(allNews, dateStr, dateStr)
        if (!dateNews.length) {
            window.alert(`No news events found for ${dateStr}.`)
            return
        }

        // Generate NewsDrawing objects
        const newsDrawings = generateNewsDrawings(
            dateNews,
            dateStr,
            data,
            runtime.drawingIdCounter + 1,
        )

        if (!newsDrawings.length) {
            window.alert(`Could not match any news events to candles for ${dateStr}. Try a different timeframe.`)
            return
        }

        // Update drawing ID counter
        runtime.drawingIdCounter += newsDrawings.length

        // Add to drawings array
        const updatedDrawings = [...runtime.drawings, ...newsDrawings]
        setDrawings(updatedDrawings)

        // Jump to the first news event's candle
        const firstNewsCandle = newsDrawings[0]
        const dataIndex = getIndexByTime(data, firstNewsCandle.time)
        if (dataIndex >= 0) {
            runtime.viewStart = Math.max(0, dataIndex - Math.floor(runtime.visibleCount / 3))
        }

        setMktAnnotDialogOpen(false)
        drawCanvas()
    }

    const closeMktAnnotDialog = () => {
        setMktAnnotDialogOpen(false)
    }

    const updateDrawingLengthMinutes = (drawingId: number, lengthMinutes: number | null) => {
        const nextDrawings = runtimeRef.current.drawings.map((drawing) => {
            if (drawing.id !== drawingId) return drawing

            if (drawing.type === 'VLINE' || drawing.type === 'FIB') {
                return drawing
            }

            if (drawing.type === 'OB') {
                if (lengthMinutes === null) return drawing
                return { ...drawing, lengthMinutes }
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
        yAxisCanvasRef,
        xAxisCanvasRef,
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
        toggleDrawMode,
        exitFullscreenRef,
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
        showNews,
        objectsOpen,
        drawMenu,
        drawings,
        ohlc,
        changeTimeframe,
        jumpToDate,
        jumpToLatest,
        jumpToMinute,
        jumpToLastCandleOfDate,
        setJumpDate,
        toggleDrawMode,
        toggleDaySeparators,
        toggleNews,
        setObjectsOpen,
        loadCsvFiles,
        removeDrawing,
        createDrawing,
        handleChartMouseDown,
        handleChartWheel,
        handleChartMouseLeave,
        handleYAxisMouseDown,
        handleYAxisDoubleClick,
        handleYAxisWheel,
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
        addBacktestSection,
        exitFullscreenRef,
        onHideTopBarRef,
        mktAnnotDialogOpen,
        chartLoading,
        confirmMarketAnnotations,
        closeMktAnnotDialog,
        prepareDayView,
        exportAllDays,
    }
}