import { createContext, useContext, type Dispatch, type RefObject, type SetStateAction } from 'react'
import type { Drawing, DrawMenuState, OhlcState, Timeframe, ToolType, FibDrawing } from '../types/chart'

export interface ChartContextValue {
  // ── Canvas refs ────────────────────────────────────────────
  chartCanvasRef: RefObject<HTMLCanvasElement | null>
  yAxisCanvasRef: RefObject<HTMLCanvasElement | null>
  xAxisCanvasRef: RefObject<HTMLCanvasElement | null>
  chartStageRef: RefObject<HTMLDivElement | null>

  // ── State ──────────────────────────────────────────────────
  currentTF: Timeframe
  jumpDate: string
  drawMode: boolean
  showDaySeparators: boolean
  objectsOpen: boolean
  drawMenu: DrawMenuState
  drawings: Drawing[]
  ohlc: OhlcState
  selectedDrawingId: number | null
  lengthEditorDrawingId: number | null
  fibSetupDrawingId: number | null
  fibPlacementStep: 'pick-first' | 'pick-second' | null
  entryPlacementStep: 'pick-entry' | 'pick-sl' | 'pick-tp' | 'pick-width' | null
  candleFilterMinute: string
  renderAfterFilterMinute: boolean
  isPickingCandleFilter: boolean
  mktAnnotDialogOpen: boolean
  setRenderAfterFilterMinute: Dispatch<SetStateAction<boolean>>
  setCandleFilterMinute: Dispatch<SetStateAction<string>>

  // ── Actions ────────────────────────────────────────────────
  changeTimeframe: (tf: Timeframe) => void
  setJumpDate: Dispatch<SetStateAction<string>>
  jumpToDate: (date: string) => void
  jumpToLatest: () => void
  jumpToMinute: (minuteStr: string) => void
  jumpToLastCandleOfDate: (dateStr: string) => void
  toggleDrawMode: () => void
  toggleDaySeparators: () => void
  setObjectsOpen: Dispatch<SetStateAction<boolean>>
  loadCsvFiles: (files: FileList | null) => void
  removeDrawing: (id: number) => void
  createDrawing: (type: ToolType) => void

  handleChartMouseDown: (event: React.MouseEvent<HTMLCanvasElement>) => void
  handleChartWheel: (event: React.WheelEvent<HTMLCanvasElement>) => void
  handleChartMouseLeave: () => void
  handleYAxisMouseDown: (event: React.MouseEvent<HTMLCanvasElement>) => void
  handleYAxisDoubleClick: () => void
  handleYAxisWheel: (event: React.WheelEvent<HTMLCanvasElement>) => void

  setSelectedDrawingId: Dispatch<SetStateAction<number | null>>
  setLengthEditorDrawingId: Dispatch<SetStateAction<number | null>>
  setFibSetupDrawingId: Dispatch<SetStateAction<number | null>>

  cancelFibPlacement: () => void
  cancelEntryPlacement: () => void

  updateDrawingLengthMinutes: (drawingId: number, lengthMinutes: number | null) => void
  updateFibDrawing: (drawingId: number, updates: Partial<Extract<Drawing, { type: 'FIB' }>>) => void

  shiftCandleFilterMinute: (deltaMinutes: number) => void
  startCandleFilterPick: () => void

  addBacktestSection: (dateStr: string, timeStr: string) => Promise<boolean>
  confirmMarketAnnotations: (dateStr: string) => void
  closeMktAnnotDialog: () => void
  prepareDayView: (dateStr: string) => Promise<void>
  exportAllDays: () => Promise<void>
  csvCacheRestored: boolean
  chartLoading: boolean
}

export const ChartContext = createContext<ChartContextValue | null>(null)

export function useChartContext(): ChartContextValue {
  const ctx = useContext(ChartContext)
  if (!ctx) {
    throw new Error('useChartContext must be used within <ChartProvider>')
  }
  return ctx
}

export type { FibDrawing }

import { type JSX, useMemo } from 'react'
import { useTradingChartController } from '../hooks/useTradingChartController'

export function ChartProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const {
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
    jumpToMinute,
    jumpToLatest,
    jumpToLastCandleOfDate,
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
    renderAfterFilterMinute,
    setRenderAfterFilterMinute,
    setCandleFilterMinute,
    shiftCandleFilterMinute,
    isPickingCandleFilter,
    startCandleFilterPick,
    addBacktestSection,
    mktAnnotDialogOpen,
    confirmMarketAnnotations,
    closeMktAnnotDialog,
    prepareDayView,
    exportAllDays,
    csvCacheRestored,
    chartLoading,
  } = useTradingChartController()

  const value = useMemo<ChartContextValue>(() => ({
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
    selectedDrawingId,
    lengthEditorDrawingId,
    fibSetupDrawingId,
    fibPlacementStep,
    entryPlacementStep,
    candleFilterMinute,
    renderAfterFilterMinute,
    setRenderAfterFilterMinute,
    setCandleFilterMinute,
    isPickingCandleFilter,
    mktAnnotDialogOpen,
    changeTimeframe,
    setJumpDate,
    jumpToDate,
    jumpToMinute,
    jumpToLastCandleOfDate,
    jumpToLatest,
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
    handleYAxisWheel,
    setSelectedDrawingId,
    setLengthEditorDrawingId,
    setFibSetupDrawingId,
    cancelFibPlacement,
    cancelEntryPlacement,
    updateDrawingLengthMinutes,
    updateFibDrawing,
    shiftCandleFilterMinute,
    startCandleFilterPick,
    addBacktestSection,
    confirmMarketAnnotations,
    closeMktAnnotDialog,
    prepareDayView,
    exportAllDays,
    csvCacheRestored,
    chartLoading,
  }), [
    chartCanvasRef, yAxisCanvasRef, xAxisCanvasRef, chartStageRef,
    currentTF, jumpDate, drawMode, showDaySeparators, objectsOpen,
    drawMenu, drawings, ohlc, selectedDrawingId,
    lengthEditorDrawingId, fibSetupDrawingId,
    fibPlacementStep, entryPlacementStep,
    candleFilterMinute, renderAfterFilterMinute, setRenderAfterFilterMinute, setCandleFilterMinute, isPickingCandleFilter,
    mktAnnotDialogOpen,
    changeTimeframe, setJumpDate,     jumpToDate,
    jumpToMinute,
    jumpToLastCandleOfDate,
    jumpToLatest, jumpToMinute,
    toggleDrawMode, toggleDaySeparators,
    setObjectsOpen, loadCsvFiles, removeDrawing, createDrawing,
    handleChartMouseDown, handleChartWheel, handleChartMouseLeave,
    handleYAxisMouseDown, handleYAxisDoubleClick, handleYAxisWheel,
    setSelectedDrawingId, setLengthEditorDrawingId, setFibSetupDrawingId,
    cancelFibPlacement, cancelEntryPlacement,
    updateDrawingLengthMinutes, updateFibDrawing,
    shiftCandleFilterMinute, startCandleFilterPick,
    addBacktestSection,
    confirmMarketAnnotations, closeMktAnnotDialog,
    prepareDayView, exportAllDays, csvCacheRestored, chartLoading,
  ])

  return <ChartContext.Provider value={value}>{children}</ChartContext.Provider>
}
