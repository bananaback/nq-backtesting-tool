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
    updateDrawingLengthMinutes,
  } = useTradingChartController()

  const lengthEditorDrawing = drawings.find((drawing) => drawing.id === lengthEditorDrawingId) ?? null

  return (
    <div className="app-shell">
      <TopBar
        currentTF={currentTF}
        jumpDate={jumpDate}
        drawMode={drawMode}
        showDaySeparators={showDaySeparators}
        objectsOpen={objectsOpen}
        onTimeframeChange={changeTimeframe}
        onJumpDateChange={setJumpDate}
        onJumpToDate={() => jumpToDate(jumpDate)}
        onToggleDrawMode={toggleDrawMode}
        onToggleDaySeparators={toggleDaySeparators}
        onToggleObjects={() => setObjectsOpen((value) => !value)}
        onLoadCsvFiles={loadCsvFiles}
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
          setLengthEditorDrawingId(drawing.id)
        }}
        onCloseLengthEditor={() => setLengthEditorDrawingId(null)}
        onSaveDrawingLength={updateDrawingLengthMinutes}
      />
    </div>
  )
}

export default App
