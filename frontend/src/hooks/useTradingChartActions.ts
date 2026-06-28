import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { Timeframe } from '../types/chart'
import type { ChartRuntimeState, DrawMenuState } from '../types/state'
import type { Drawing } from '../types/drawings/index'
import { createLoadCsvFiles } from './loadTradingChartCsvFiles'
import { createChartNavigation } from './useChartNavigation'
import { createChartZoom } from './useChartZoom'
import { createMouseInteraction } from './useMouseInteraction'
import { createDrawingsManager } from './useDrawingsManager'
import { createBacktest } from './useBacktest'
import { createMarketAnnotations } from './useMarketAnnotations'
import { createExport } from './useExport'

type TradingChartActionsDeps = {
    chartCanvasRef: RefObject<HTMLCanvasElement | null>
    yAxisCanvasRef: RefObject<HTMLCanvasElement | null>
    xAxisCanvasRef: RefObject<HTMLCanvasElement | null>
    runtimeRef: RefObject<ChartRuntimeState>
    currentTfRef: RefObject<Timeframe>
    drawModeRef: RefObject<boolean>
    showDaySeparatorsRef: RefObject<boolean>
    drawMenuOpenRef: RefObject<boolean>
    setCurrentTF: Dispatch<SetStateAction<Timeframe>>
    setJumpDate: Dispatch<SetStateAction<string>>
    setDrawMode: Dispatch<SetStateAction<boolean>>
    setShowDaySeparators: Dispatch<SetStateAction<boolean>>
    setShowNews: Dispatch<SetStateAction<boolean>>
    setDrawMenu: Dispatch<SetStateAction<DrawMenuState>>
    setDrawings: Dispatch<SetStateAction<Drawing[]>>
    setSelectedDrawingId?: Dispatch<SetStateAction<number | null>>
    setFibPlacementStep: Dispatch<SetStateAction<'pick-first' | 'pick-second' | null>>
    setEntryPlacementStep: Dispatch<SetStateAction<'pick-entry' | 'pick-sl' | 'pick-tp' | 'pick-width' | null>>
    setCandleFilterMinute?: Dispatch<SetStateAction<string>>
    setRenderAfterFilterMinute?: Dispatch<SetStateAction<boolean>>
    setMktAnnotDialogOpen: Dispatch<SetStateAction<boolean>>
    onHideTopBar?: () => void
    setChartLoading?: (v: boolean) => void
    drawCanvas: () => void
}

export function createTradingChartActions({
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
    onHideTopBar,
    setChartLoading,
    drawCanvas,
}: TradingChartActionsDeps) {
    const navigation = createChartNavigation({
        runtimeRef, currentTfRef, setCurrentTF, setJumpDate, drawCanvas,
    })

    const zoom = createChartZoom({
        chartCanvasRef, runtimeRef, currentTfRef, drawMenuOpenRef, drawCanvas,
    })

    const mouse = createMouseInteraction({
        chartCanvasRef, runtimeRef, drawMenuOpenRef, drawCanvas,
    })

    const backtest = createBacktest({
        runtimeRef, currentTfRef, setJumpDate, setCandleFilterMinute, setRenderAfterFilterMinute, drawCanvas,
    })

    const drawingsManager = createDrawingsManager({
        runtimeRef, currentTfRef, drawModeRef, drawMenuOpenRef, setDrawMenu, setDrawings, setSelectedDrawingId, setFibPlacementStep, setEntryPlacementStep, setDrawMode, setMktAnnotDialogOpen, drawCanvas,
    })

    const toggleDrawMode = () => {
        const next = !drawModeRef.current
        drawModeRef.current = next
        setDrawMode(next)
        if (!next) setDrawMenu(null)
        if (chartCanvasRef.current) chartCanvasRef.current.style.cursor = 'crosshair'
        drawCanvas()
    }

    const toggleDaySeparators = () => {
        const next = !showDaySeparatorsRef.current
        showDaySeparatorsRef.current = next
        runtimeRef.current.showDaySeparators = next
        setShowDaySeparators(next)
        drawCanvas()
    }

    const toggleNews = () => {
        const next = !runtimeRef.current.showNews
        runtimeRef.current.showNews = next
        setShowNews(next)
        drawCanvas()
    }

    const {
        findTimeByDayAndClock,
        findPreviousClockClose,
        findPriorClockAcrossDays,
        findSessionOpenOnPreviousDay,
        buildSessionGapDrawing,
        listAvailableDaysUntil,
    } = drawingsManager

    const marketAnnotations = createMarketAnnotations({
        runtimeRef, currentTfRef, setDrawings, setSelectedDrawingId, setJumpDate, setMktAnnotDialogOpen, onHideTopBar, drawCanvas,
        findTimeByDayAndClock,
        findPreviousClockClose,
        findPriorClockAcrossDays,
        findSessionOpenOnPreviousDay,
        buildSessionGapDrawing,
        listAvailableDaysUntil,
    })

    const export_ = createExport({
        runtimeRef, chartCanvasRef, yAxisCanvasRef, xAxisCanvasRef, drawCanvas,
        prepareDayView: marketAnnotations.prepareDayView,
    })

    const loadCsvFiles = createLoadCsvFiles({ runtimeRef, currentTfRef, drawCanvas, setChartLoading: setChartLoading! })

    return {
        ...navigation,
        ...zoom,
        ...mouse,
        ...backtest,
        ...drawingsManager,
        ...marketAnnotations,
        ...export_,
        toggleDrawMode,
        toggleDaySeparators,
        toggleNews,
        loadCsvFiles,
    }
}
