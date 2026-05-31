import ChartStage from './components/ChartStage'
import TopBar from './components/TopBar'
import { useTradingChartController } from './hooks/useTradingChartController'
import './App.css'

function App() {
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
    updateDrawingLengthMinutes,
    updateFibDrawing,
    candleFilterMinute,
    renderAfterFilterMinute,
    setRenderAfterFilterMinute,
    shiftCandleFilterMinute,
    isPickingCandleFilter,
    startCandleFilterPick,
  } = useTradingChartController()

  const lengthEditorDrawing = drawings.find((drawing) => drawing.id === lengthEditorDrawingId) ?? null
  const fibSetupDrawing = drawings.find((drawing) => drawing.id === fibSetupDrawingId) ?? null

  return (
    <div className="app-shell">
      <TopBar
        currentTF={currentTF}
        jumpDate={jumpDate}
        drawMode={drawMode}
        showDaySeparators={showDaySeparators}
        objectsOpen={objectsOpen}
        candleFilterMinute={candleFilterMinute}
        renderAfterFilterMinute={renderAfterFilterMinute}
        isPickingCandleFilter={isPickingCandleFilter}
        onTimeframeChange={changeTimeframe}
        onJumpDateChange={setJumpDate}
        onJumpToDate={() => jumpToDate(jumpDate)}
        onToggleDrawMode={toggleDrawMode}
        onToggleDaySeparators={toggleDaySeparators}
        onToggleObjects={() => setObjectsOpen((value) => !value)}
        onLoadCsvFiles={loadCsvFiles}
        onRenderAfterFilterMinuteChange={setRenderAfterFilterMinute}
        onStepCandleFilterMinute={shiftCandleFilterMinute}
        onStartCandleFilterPick={startCandleFilterPick}
      />

      <ChartStage
        chartCanvasRef={chartCanvasRef}
        yAxisCanvasRef={yAxisCanvasRef}
        xAxisCanvasRef={xAxisCanvasRef}
        chartStageRef={chartStageRef}
        drawMenu={drawMenu}
        objectsOpen={objectsOpen}
        drawings={drawings}
        ohlc={ohlc}
        onChartMouseDown={handleChartMouseDown}
        onChartWheel={handleChartWheel}
        onChartMouseLeave={handleChartMouseLeave}
        onYAxisMouseDown={handleYAxisMouseDown}
        onYAxisDoubleClick={handleYAxisDoubleClick}
        onCreateDrawing={createDrawing}
        onRemoveDrawing={removeDrawing}
        onCloseObjects={() => setObjectsOpen(false)}
        selectedDrawingId={selectedDrawingId}
        onSelectDrawing={setSelectedDrawingId}
        lengthEditorDrawing={lengthEditorDrawing}
        onEditDrawing={(drawing) => {
          setSelectedDrawingId(drawing.id)
          if (drawing.type === 'FIB') {
            setFibSetupDrawingId(drawing.id)
            setLengthEditorDrawingId(null)
          } else {
            setLengthEditorDrawingId(drawing.id)
            setFibSetupDrawingId(null)
          }
        }}
        onCloseLengthEditor={() => setLengthEditorDrawingId(null)}
        onSaveDrawingLength={updateDrawingLengthMinutes}
        fibSetupDrawing={fibSetupDrawing}
        onCloseFibSetup={() => setFibSetupDrawingId(null)}
        onSaveFibSetup={(drawingId, updates) => updateFibDrawing(drawingId, updates)}
        fibPlacementStep={fibPlacementStep}
        onCancelFibPlacement={cancelFibPlacement}
      />
    </div>
  )
}

export default App
