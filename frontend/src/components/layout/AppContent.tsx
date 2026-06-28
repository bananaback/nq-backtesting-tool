import { useChartContext } from '../../context/ChartContext'
import TopBar from './TopBar'
import ChartStage from '../chart/ChartStage'
import MarketAnnotationsDialog from '../modals/MarketAnnotationsDialog'
import { useEffect, useState, useCallback } from 'react'
import JumpDateModal from '../modals/JumpDateModal'
import NewsSearchModal from '../modals/NewsSearchModal'
import BacktestFloatDock from './BacktestFloatDock'
import AutoAnnotFloatDock from './AutoAnnotFloatDock'
import { useTfQuickInput } from '../../hooks/useTfQuickInput'

function AppContent() {
  const ctx = useChartContext()
  const [isTopBarVisible, setIsTopBarVisible] = useState(true)
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false)
  const [sectionCounter, setSectionCounter] = useState(0)
  const [isJumpDateModalOpen, setIsJumpDateModalOpen] = useState(false)
  const [isNewsSearchModalOpen, setIsNewsSearchModalOpen] = useState(false)
  const [isBacktestMode, setIsBacktestMode] = useState(false)
  const [isAutoAnnotMode, setIsAutoAnnotMode] = useState(false)
  const [prepareDayDialogOpen, setPrepareDayDialogOpen] = useState(false)

  const { tfQuickInput, setTfQuickInput } = useTfQuickInput(
    ctx.changeTimeframe,
    () => { if (!isTopBarVisible) setIsTopBarVisible(true) },
  )

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
      setIsBacktestMode(false)
      setIsSectionModalOpen(false)
      setIsTopBarVisible(true)
      ctx.setCandleFilterMinute('')
      ctx.setRenderAfterFilterMinute(false)
    } else {
      setIsSectionModalOpen(true)
      if (isAutoAnnotMode) {
        setIsAutoAnnotMode(false)
        setPrepareDayDialogOpen(false)
        ctx.drawings.forEach((d) => ctx.removeDrawing(d.id))
      }
    }
  }, [isBacktestMode, isAutoAnnotMode, ctx.drawings, ctx.removeDrawing, ctx.setCandleFilterMinute, ctx.setRenderAfterFilterMinute])

  const toggleAutoAnnot = useCallback(() => {
    if (isAutoAnnotMode) {
      setIsAutoAnnotMode(false)
      setPrepareDayDialogOpen(false)
      ctx.drawings.forEach((d) => ctx.removeDrawing(d.id))
    } else {
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
    while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() - 1)
    ctx.prepareDayView(date.toISOString().slice(0, 10))
  }, [ctx.jumpDate, ctx.prepareDayView])

  const handleNextDay = useCallback(() => {
    if (!ctx.jumpDate) return
    const date = new Date(`${ctx.jumpDate}T12:00:00`)
    date.setDate(date.getDate() + 1)
    while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1)
    ctx.prepareDayView(date.toISOString().slice(0, 10))
  }, [ctx.jumpDate, ctx.prepareDayView])

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
          onCloseSectionModal={() => setIsSectionModalOpen(false)}
          onSubmitSection={handleSectionSubmit}
          sectionDefaultName={`Section ${sectionCounter + 1}`}
          onHideTopBar={() => setIsTopBarVisible(false)}
          onOpenNewsSearch={() => setIsNewsSearchModalOpen(true)}
        />
      ) : null}

      {!isTopBarVisible ? (
        <div className="fullscreen-controls" aria-label="Fullscreen controls">
          {isBacktestMode ? (
            <BacktestFloatDock
              currentTF={ctx.currentTF}
              changeTimeframe={ctx.changeTimeframe}
              isPickingCandleFilter={ctx.isPickingCandleFilter}
              startCandleFilterPick={ctx.startCandleFilterPick}
              candleFilterMinute={ctx.candleFilterMinute}
              shiftCandleFilterMinute={ctx.shiftCandleFilterMinute}
              renderAfterFilterMinute={ctx.renderAfterFilterMinute}
              setRenderAfterFilterMinute={ctx.setRenderAfterFilterMinute}
            />
          ) : null}
          {isAutoAnnotMode ? (
            <AutoAnnotFloatDock
              jumpDate={ctx.jumpDate}
              jumpToDate={ctx.jumpToDate}
              onPrevDay={handlePrevDay}
              onNextDay={handleNextDay}
            />
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
        onJumpToLatest={ctx.jumpToLatest}
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

      {isNewsSearchModalOpen ? (
        <NewsSearchModal
          onClose={() => setIsNewsSearchModalOpen(false)}
          onJumpToDate={(dateTime) => {
            ctx.setJumpDate(dateTime.slice(0, 10))
            ctx.jumpToMinute(dateTime)
            setIsNewsSearchModalOpen(false)
          }}
        />
      ) : null}

      {prepareDayDialogOpen ? (
        <MarketAnnotationsDialog
          onClose={() => setPrepareDayDialogOpen(false)}
          onConfirm={(dateStr) => {
            setPrepareDayDialogOpen(false)
            ctx.prepareDayView(dateStr)
            setIsTopBarVisible(false)
          }}
        />
      ) : null}
    </div>
  )
}

export default AppContent
