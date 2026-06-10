import ChartStage from './components/ChartStage'
import TopBar from './components/TopBar'
import MarketAnnotationsDialog from './components/MarketAnnotationsDialog'
import { useTradingChartController } from './hooks/useTradingChartController'
import './App.css'
import { useEffect, useState } from 'react'

function App() {
  const [isTopBarVisible, setIsTopBarVisible] = useState(true)
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false)
  const [sectionCounter, setSectionCounter] = useState(0)
  const [prepareDayDialogOpen, setPrepareDayDialogOpen] = useState(false)

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'))
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [isTopBarVisible])

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
    entryPlacementStep,
    cancelEntryPlacement,
    updateDrawingLengthMinutes,
    updateFibDrawing,
    candleFilterMinute,
    renderAfterFilterMinute,
    setRenderAfterFilterMinute,
    shiftCandleFilterMinute,
    isPickingCandleFilter,
    startCandleFilterPick,
    addBacktestSection,
    exitFullscreenRef,
    onHideTopBarRef,
    mktAnnotDialogOpen,
    confirmMarketAnnotations,
    closeMktAnnotDialog,
    prepareDayView,
    exportAllDays,
  } = useTradingChartController()

  useEffect(() => {
    exitFullscreenRef.current = () => setIsTopBarVisible(true)
    onHideTopBarRef.current = () => setIsTopBarVisible(false)
  }, [exitFullscreenRef, onHideTopBarRef, setIsTopBarVisible])

  const lengthEditorDrawing = drawings.find((drawing) => drawing.id === lengthEditorDrawingId) ?? null
  const fibSetupDrawing = drawings.find((drawing) => drawing.id === fibSetupDrawingId) ?? null

  const handleSectionSubmit = async (_name: string, date: string, time: string): Promise<boolean> => {
    const success = await addBacktestSection(date, time)
    if (success) {
      setSectionCounter(prev => prev + 1)
    }
    return success
  }

  const sectionDefaultName = `Section ${sectionCounter + 1}`

  return (
    <div className={isTopBarVisible ? 'app-shell' : 'app-shell topbar-hidden'}>
      {isTopBarVisible ? (
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
          onHideTopBar={() => setIsTopBarVisible(false)}
          onPrepareDayView={() => setPrepareDayDialogOpen(true)}
          onExportAllDays={exportAllDays}
          isSectionModalOpen={isSectionModalOpen}
          onOpenSectionModal={() => setIsSectionModalOpen(true)}
          onCloseSectionModal={() => setIsSectionModalOpen(false)}
          onSubmitSection={handleSectionSubmit}
          sectionDefaultName={sectionDefaultName}
        />
      ) : null}

      {!isTopBarVisible ? (
        <div className="fullscreen-controls" aria-label="Fullscreen controls">
          <button type="button" className="topbar-float-toggle" onClick={() => setIsTopBarVisible(true)}>
            Show Top Bar
          </button>

          <div className="backtest-float-dock" aria-label="Backtest controls">
            <div className="backtest-float-dock__tf" role="tablist" aria-label="Timeframes">
              {(['m1', 'm5', 'm15', 'h1'] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  className={currentTF === tf ? 'backtest-float-dock__btn is-on' : 'backtest-float-dock__btn'}
                  onClick={() => changeTimeframe(tf)}
                >
                  {tf === 'm1' ? '1m' : tf === 'm5' ? '5m' : tf === 'm15' ? '15m' : '1h'}
                </button>
              ))}
            </div>

            <button
              type="button"
              className={isPickingCandleFilter ? 'backtest-float-dock__btn is-on' : 'backtest-float-dock__btn'}
              onClick={startCandleFilterPick}
            >
              {isPickingCandleFilter ? 'Picking... click candle' : 'Pick Candle'}
            </button>

            <span className="backtest-float-dock__selected">{candleFilterMinute ? candleFilterMinute.replace('T', ' ') : 'No candle selected'}</span>

            <button
              type="button"
              className="backtest-float-dock__btn"
              onClick={() => shiftCandleFilterMinute(-1)}
              disabled={!candleFilterMinute}
            >
              Prev
            </button>

            <button
              type="button"
              className="backtest-float-dock__btn"
              onClick={() => shiftCandleFilterMinute(1)}
              disabled={!candleFilterMinute}
            >
              Next
            </button>

            <button
              type="button"
              className={renderAfterFilterMinute ? 'backtest-float-dock__btn is-on' : 'backtest-float-dock__btn'}
              onClick={() => setRenderAfterFilterMinute(!renderAfterFilterMinute)}
              disabled={!candleFilterMinute}
            >
              {renderAfterFilterMinute ? 'After: Show' : 'After: Hide'}
            </button>
          </div>
        </div>
      ) : null}

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
        entryPlacementStep={entryPlacementStep}
        onCancelEntryPlacement={cancelEntryPlacement}
        mktAnnotDialogOpen={mktAnnotDialogOpen}
        onCloseMktAnnotDialog={closeMktAnnotDialog}
        onConfirmMktAnnot={confirmMarketAnnotations}
      />
      {prepareDayDialogOpen ? (
        <MarketAnnotationsDialog
          onClose={() => setPrepareDayDialogOpen(false)}
          onConfirm={(dateStr) => {
            setPrepareDayDialogOpen(false)
            prepareDayView(dateStr)
          }}
        />
      ) : null}
    </div>
  )
}

export default App
