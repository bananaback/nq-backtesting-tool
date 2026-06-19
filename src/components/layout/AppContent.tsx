import { useChartContext } from '../../context/ChartContext'
import TopBar from './TopBar'
import ChartStage from '../chart/ChartStage'
import MarketAnnotationsDialog from '../modals/MarketAnnotationsDialog'
import { useEffect, useState, useCallback } from 'react'

function AppContent() {
  const ctx = useChartContext()
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

  const lengthEditorDrawing = ctx.drawings.find((d) => d.id === ctx.lengthEditorDrawingId) ?? null
  const fibSetupDrawing = ctx.drawings.find((d) => d.id === ctx.fibSetupDrawingId) ?? null

  const handleSectionSubmit = useCallback(async (_name: string, date: string, time: string): Promise<boolean> => {
    const success = await ctx.addBacktestSection(date, time)
    if (success) setSectionCounter((prev) => prev + 1)
    return success
  }, [ctx.addBacktestSection])

  const sectionDefaultName = `Section ${sectionCounter + 1}`

  const handleEditDrawing = useCallback((drawing: typeof ctx.drawings[number]) => {
    ctx.setSelectedDrawingId(drawing.id)
    if (drawing.type === 'FIB') {
      ctx.setFibSetupDrawingId(drawing.id)
      ctx.setLengthEditorDrawingId(null)
    } else {
      ctx.setLengthEditorDrawingId(drawing.id)
      ctx.setFibSetupDrawingId(null)
    }
  }, [ctx.setSelectedDrawingId, ctx.setFibSetupDrawingId, ctx.setLengthEditorDrawingId])

  return (
    <div className={isTopBarVisible ? 'app-shell' : 'app-shell topbar-hidden'}>
      {isTopBarVisible ? (
        <TopBar
          isSectionModalOpen={isSectionModalOpen}
          onOpenSectionModal={() => setIsSectionModalOpen(true)}
          onCloseSectionModal={() => setIsSectionModalOpen(false)}
          onSubmitSection={handleSectionSubmit}
          sectionDefaultName={sectionDefaultName}
          onHideTopBar={() => setIsTopBarVisible(false)}
          onPrepareDayView={() => setPrepareDayDialogOpen(true)}
          onExportAllDays={ctx.exportAllDays}
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
                  className={ctx.currentTF === tf ? 'backtest-float-dock__btn is-on' : 'backtest-float-dock__btn'}
                  onClick={() => ctx.changeTimeframe(tf)}
                >
                  {tf === 'm1' ? '1m' : tf === 'm5' ? '5m' : tf === 'm15' ? '15m' : '1h'}
                </button>
              ))}
            </div>

            <button
              type="button"
              className={ctx.isPickingCandleFilter ? 'backtest-float-dock__btn is-on' : 'backtest-float-dock__btn'}
              onClick={ctx.startCandleFilterPick}
            >
              {ctx.isPickingCandleFilter ? 'Picking... click candle' : 'Pick Candle'}
            </button>

            <span className="backtest-float-dock__selected">
              {ctx.candleFilterMinute ? ctx.candleFilterMinute.replace('T', ' ') : 'No candle selected'}
            </span>

            <button
              type="button"
              className="backtest-float-dock__btn"
              onClick={() => ctx.shiftCandleFilterMinute(-1)}
              disabled={!ctx.candleFilterMinute}
            >
              Prev
            </button>

            <button
              type="button"
              className="backtest-float-dock__btn"
              onClick={() => ctx.shiftCandleFilterMinute(1)}
              disabled={!ctx.candleFilterMinute}
            >
              Next
            </button>

            <button
              type="button"
              className={ctx.renderAfterFilterMinute ? 'backtest-float-dock__btn is-on' : 'backtest-float-dock__btn'}
              onClick={() => ctx.setRenderAfterFilterMinute(!ctx.renderAfterFilterMinute)}
              disabled={!ctx.candleFilterMinute}
            >
              {ctx.renderAfterFilterMinute ? 'After: Show' : 'After: Hide'}
            </button>
          </div>
        </div>
      ) : null}

      <ChartStage
        lengthEditorDrawing={lengthEditorDrawing}
        onEditDrawing={handleEditDrawing}
        onCloseLengthEditor={() => ctx.setLengthEditorDrawingId(null)}
        onSaveDrawingLength={ctx.updateDrawingLengthMinutes}
        fibSetupDrawing={fibSetupDrawing}
        onCloseFibSetup={() => ctx.setFibSetupDrawingId(null)}
        onSaveFibSetup={ctx.updateFibDrawing}
      />

      {prepareDayDialogOpen ? (
        <MarketAnnotationsDialog
          onClose={() => setPrepareDayDialogOpen(false)}
          onConfirm={(dateStr) => {
            setPrepareDayDialogOpen(false)
            ctx.prepareDayView(dateStr)
          }}
        />
      ) : null}
    </div>
  )
}

export default AppContent
