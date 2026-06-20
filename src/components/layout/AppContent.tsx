import { useChartContext } from '../../context/ChartContext'
import TopBar from './TopBar'
import ChartStage from '../chart/ChartStage'
import MarketAnnotationsDialog from '../modals/MarketAnnotationsDialog'
import { useEffect, useState, useCallback } from 'react'
import JumpDateModal from '../modals/JumpDateModal'

function AppContent() {
  const ctx = useChartContext()
  const [isTopBarVisible, setIsTopBarVisible] = useState(true)
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false)
  const [sectionCounter, setSectionCounter] = useState(0)
  const [isJumpDateModalOpen, setIsJumpDateModalOpen] = useState(false)
  const [isBacktestMode, setIsBacktestMode] = useState(false)
  const [isAutoAnnotMode, setIsAutoAnnotMode] = useState(false)
  const [prepareDayDialogOpen, setPrepareDayDialogOpen] = useState(false)
  const [tfQuickInput, setTfQuickInput] = useState<{ visible: boolean; value: string }>({ visible: false, value: '' })

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'))
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [isTopBarVisible])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement)?.isContentEditable) return

      const key = e.key

      if (tfQuickInput.visible) {
        if (key === 'Enter') {
          e.preventDefault()
          const val = tfQuickInput.value.toLowerCase().trim()
          if (val === '1h' || val === '60') ctx.changeTimeframe('h1')
          else if (val === '1') ctx.changeTimeframe('m1')
          else if (val === '5') ctx.changeTimeframe('m5')
          else if (val === '15') ctx.changeTimeframe('m15')
          setTfQuickInput({ visible: false, value: '' })
        } else if (key === 'Escape') {
          setTfQuickInput({ visible: false, value: '' })
        } else if (key === 'Backspace') {
          const next = tfQuickInput.value.slice(0, -1)
          setTfQuickInput({ visible: next.length > 0, value: next })
        } else if (/^[0-9hH]$/.test(key)) {
          setTfQuickInput(prev => ({ ...prev, value: prev.value + key.toLowerCase() }))
        }
      } else {
        if (/^[0-9]$/.test(key)) {
          e.preventDefault()
          setTfQuickInput({ visible: true, value: key })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tfQuickInput, ctx.changeTimeframe])

  const lengthEditorDrawing = ctx.drawings.find((d) => d.id === ctx.lengthEditorDrawingId) ?? null
  const fibSetupDrawing = ctx.drawings.find((d) => d.id === ctx.fibSetupDrawingId) ?? null

  const handleSectionSubmit = useCallback(async (_name: string, date: string, time: string): Promise<boolean> => {
    const success = await ctx.addBacktestSection(date, time)
    if (success) {
      setSectionCounter((prev) => prev + 1)
      setIsBacktestMode(true)
      setIsSectionModalOpen(false)
      setIsTopBarVisible(false)
    }
    return success
  }, [ctx.addBacktestSection])

  const toggleBacktest = useCallback(() => {
    if (isBacktestMode) {
      // Exit backtest mode
      setIsBacktestMode(false)
      setIsSectionModalOpen(false)
      setIsTopBarVisible(true)
      ctx.setCandleFilterMinute('')
      ctx.setRenderAfterFilterMinute(false)
    } else {
      // Enter backtest mode: show form. Exit auto annot if active.
      setIsSectionModalOpen(true)
      if (isAutoAnnotMode) {
        setIsAutoAnnotMode(false)
        setPrepareDayDialogOpen(false)
        // Clear all objects (drawings)
        const drawingsCopy = [...ctx.drawings]
        drawingsCopy.forEach((d) => ctx.removeDrawing(d.id))
      }
    }
  }, [isBacktestMode, isAutoAnnotMode, ctx.drawings, ctx.removeDrawing, ctx.setCandleFilterMinute, ctx.setRenderAfterFilterMinute])

  const handleCloseSectionModal = useCallback(() => {
    setIsSectionModalOpen(false)
  }, [])

  const handleJumpToLatest = useCallback(() => {
    ctx.jumpToLatest()
  }, [ctx.jumpToLatest])

  const toggleAutoAnnot = useCallback(() => {
    if (isAutoAnnotMode) {
      // Turn off: clear objects, exit mode
      setIsAutoAnnotMode(false)
      setPrepareDayDialogOpen(false)
      // Clear all objects (drawings)
      const drawingsCopy = [...ctx.drawings]
      drawingsCopy.forEach((d) => ctx.removeDrawing(d.id))
    } else {
      // Turn on: show dialog. Exit backtest mode if active.
      setIsAutoAnnotMode(true)
      setPrepareDayDialogOpen(true)
      if (isBacktestMode) {
        setIsBacktestMode(false)
        setIsSectionModalOpen(false)
        setIsTopBarVisible(true)
      }
    }
  }, [isAutoAnnotMode, isBacktestMode, ctx.drawings, ctx.removeDrawing])

  const handlePrevDay = useCallback(() => {
    if (!ctx.jumpDate) return
    const date = new Date(`${ctx.jumpDate}T12:00:00`)
    date.setDate(date.getDate() - 1)
    // Skip weekends (0=Sun, 6=Sat)
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() - 1)
    }
    const prevDate = date.toISOString().slice(0, 10)
    ctx.prepareDayView(prevDate)
  }, [ctx.jumpDate, ctx.prepareDayView])

  const handleNextDay = useCallback(() => {
    if (!ctx.jumpDate) return
    const date = new Date(`${ctx.jumpDate}T12:00:00`)
    date.setDate(date.getDate() + 1)
    // Skip weekends (0=Sun, 6=Sat)
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1)
    }
    const nextDate = date.toISOString().slice(0, 10)
    ctx.prepareDayView(nextDate)
  }, [ctx.jumpDate, ctx.prepareDayView])

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
          isBacktestMode={isBacktestMode}
          isAutoAnnotMode={isAutoAnnotMode}
          onToggleBacktest={toggleBacktest}
          onToggleAutoAnnot={toggleAutoAnnot}
          onCloseSectionModal={handleCloseSectionModal}
          onSubmitSection={handleSectionSubmit}
          sectionDefaultName={sectionDefaultName}
          onHideTopBar={() => setIsTopBarVisible(false)}
        />
      ) : null}

      {!isTopBarVisible ? (
        <div className="fullscreen-controls" aria-label="Fullscreen controls">
          {isBacktestMode ? (
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
          ) : null}
          {isAutoAnnotMode ? (
            <div className="backtest-float-dock" aria-label="Auto annotation controls">
              <button
                type="button"
                className="backtest-float-dock__btn"
                onClick={handlePrevDay}
                title="Previous trading day"
              >
                ◀ Prev Day
              </button>
              <button
                type="button"
                className="backtest-float-dock__btn"
                onClick={() => { if (ctx.jumpDate) ctx.jumpToDate(ctx.jumpDate) }}
                title="Jump back to current annotated day"
              >
                📍 Current
              </button>
              <button
                type="button"
                className="backtest-float-dock__btn"
                onClick={handleNextDay}
                title="Next trading day"
              >
                Next Day ▶
              </button>
            </div>
          ) : null}

          <button type="button" className="topbar-float-toggle" onClick={() => setIsTopBarVisible(true)} title="Show Top Bar">
            ⛶
          </button>
        </div>
      ) : null}

      <ChartStage
        isBacktestMode={isBacktestMode}
        lengthEditorDrawing={lengthEditorDrawing}
        onEditDrawing={handleEditDrawing}
        onCloseLengthEditor={() => ctx.setLengthEditorDrawingId(null)}
        onSaveDrawingLength={ctx.updateDrawingLengthMinutes}
        fibSetupDrawing={fibSetupDrawing}
        onCloseFibSetup={() => ctx.setFibSetupDrawingId(null)}
        onSaveFibSetup={ctx.updateFibDrawing}
        onJumpToLatest={handleJumpToLatest}
        tfQuickInput={tfQuickInput}
        onTfQuickInputChange={setTfQuickInput}
        onOpenJumpDateModal={() => setIsJumpDateModalOpen(true)}
      />

      {isJumpDateModalOpen ? (
        <JumpDateModal
          onClose={() => setIsJumpDateModalOpen(false)}
          onJump={(date) => {
            ctx.setJumpDate(date)
            ctx.jumpToDate(date)
            setIsJumpDateModalOpen(false)
          }}
        />
      ) : null}

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
