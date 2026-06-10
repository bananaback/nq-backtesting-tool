import type { MouseEvent, RefObject, WheelEvent } from 'react'
import DrawMenu from './DrawMenu'
import DrawingLengthModal from './DrawingLengthModal.tsx'
import FibSetupModal from './FibSetupModal'
import MarketAnnotationsDialog from './MarketAnnotationsDialog'
import ObjectsPanel from './ObjectsPanel'
import OhlcBox from './OhlcBox'
import type { Drawing, DrawMenuState, FibDrawing, OhlcState, ToolType } from '../chartTypes'

type ChartStageProps = {
    chartCanvasRef: RefObject<HTMLCanvasElement | null>
    yAxisCanvasRef: RefObject<HTMLCanvasElement | null>
    xAxisCanvasRef: RefObject<HTMLCanvasElement | null>
    chartStageRef: RefObject<HTMLDivElement | null>
    drawMenu: DrawMenuState
    objectsOpen: boolean
    drawings: Drawing[]
    ohlc: OhlcState
    onChartMouseDown: (event: MouseEvent<HTMLCanvasElement>) => void
    onChartWheel: (event: WheelEvent<HTMLCanvasElement>) => void
    onChartMouseLeave: () => void
    onYAxisMouseDown: (event: MouseEvent<HTMLCanvasElement>) => void
    onYAxisDoubleClick: () => void
    onCreateDrawing: (type: ToolType) => void
    onRemoveDrawing: (id: number) => void
    onCloseObjects: () => void
    selectedDrawingId?: number | null
    onSelectDrawing?: (id: number | null) => void
    lengthEditorDrawing?: Drawing | null
    onEditDrawing?: (drawing: Drawing) => void
    onCloseLengthEditor?: () => void
    onSaveDrawingLength?: (drawingId: number, lengthMinutes: number | null) => void
    fibSetupDrawing?: Drawing | null
    onCloseFibSetup?: () => void
    onSaveFibSetup?: (drawingId: number, updates: Pick<FibDrawing, 'templateKey' | 'extendRight' | 'reverse' | 'lineStyle' | 'lineWidth' | 'levels'>) => void
    fibPlacementStep?: 'pick-first' | 'pick-second' | null
    onCancelFibPlacement?: () => void
    entryPlacementStep?: 'pick-entry' | 'pick-sl' | 'pick-tp' | 'pick-width' | null
    onCancelEntryPlacement?: () => void
    mktAnnotDialogOpen?: boolean
    onCloseMktAnnotDialog?: () => void
    onConfirmMktAnnot?: (dateStr: string) => void
}

function ChartStage({
    chartCanvasRef,
    yAxisCanvasRef,
    xAxisCanvasRef,
    chartStageRef,
    drawMenu,
    objectsOpen,
    drawings,
    ohlc,
    onChartMouseDown,
    onChartWheel,
    onChartMouseLeave,
    onYAxisMouseDown,
    onYAxisDoubleClick,
    onCreateDrawing,
    onRemoveDrawing,
    onCloseObjects,
    selectedDrawingId,
    onSelectDrawing,
    lengthEditorDrawing,
    onEditDrawing,
    onCloseLengthEditor,
    onSaveDrawingLength,
    fibSetupDrawing,
    onCloseFibSetup,
    onSaveFibSetup,
    fibPlacementStep,
    onCancelFibPlacement,
    entryPlacementStep,
    onCancelEntryPlacement,
    mktAnnotDialogOpen,
    onCloseMktAnnotDialog,
    onConfirmMktAnnot,
}: ChartStageProps) {
    const fibSetupDrawingForModal = fibSetupDrawing && fibSetupDrawing.type === 'FIB' ? fibSetupDrawing as FibDrawing : null

    return (
        <main className="workspace">
            <div className="chart-stage" ref={chartStageRef}>
                <div className="chart-row">
                    <canvas
                        ref={chartCanvasRef}
                        className="chart-canvas"
                        onMouseDown={onChartMouseDown}
                        onWheel={onChartWheel}
                        onMouseLeave={onChartMouseLeave}
                        aria-label="Candlestick chart"
                    />

                    <canvas
                        ref={yAxisCanvasRef}
                        className="y-axis-canvas"
                        onMouseDown={onYAxisMouseDown}
                        onDoubleClick={onYAxisDoubleClick}
                        aria-label="Y axis"
                    />

                    {drawMenu ? <DrawMenu position={drawMenu} onCreateDrawing={onCreateDrawing} /> : null}
                    {objectsOpen ? <ObjectsPanel drawings={drawings} onRemove={onRemoveDrawing} onClose={onCloseObjects} selectedDrawingId={selectedDrawingId} onSelect={onSelectDrawing} onEditDrawing={onEditDrawing} /> : null}
                    <OhlcBox ohlc={ohlc} />
                    {fibPlacementStep && !drawMenu ? (
                        <div className="fib-placement-hint">
                            <div className="fib-placement-hint__title">Fibonacci</div>
                            <div className="fib-placement-hint__text">
                                {fibPlacementStep === 'pick-first' ? 'Click the first anchor point.' : 'Click the second anchor point.'}
                            </div>
                            {onCancelFibPlacement ? (
                                <button type="button" className="fib-placement-hint__cancel" onClick={onCancelFibPlacement}>
                                    Cancel
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                    {entryPlacementStep && !drawMenu ? (
                        <div className="entry-placement-hint">
                            <div className="entry-placement-hint__title">
                                Entry
                            </div>
                            <div className="entry-placement-hint__text">
                                {entryPlacementStep === 'pick-entry' ? 'Click the entry price on the chart.' : entryPlacementStep === 'pick-sl' ? 'Click the stop loss price on the chart.' : entryPlacementStep === 'pick-tp' ? 'Click the take profit price on the chart.' : 'Click to set the entry width on the chart.'}
                            </div>
                            {onCancelEntryPlacement ? (
                                <button type="button" className="entry-placement-hint__cancel" onClick={onCancelEntryPlacement}>
                                    Cancel
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                    {lengthEditorDrawing && onCloseLengthEditor && onSaveDrawingLength ? (
                        <DrawingLengthModal
                            drawing={lengthEditorDrawing}
                            onClose={onCloseLengthEditor}
                            onSave={onSaveDrawingLength}
                        />
                    ) : null}
                    {fibSetupDrawingForModal && onCloseFibSetup && onSaveFibSetup ? (
                        <FibSetupModal
                            drawing={fibSetupDrawingForModal}
                            onClose={onCloseFibSetup}
                            onSave={onSaveFibSetup}
                        />
                    ) : null}
                    {mktAnnotDialogOpen && onCloseMktAnnotDialog && onConfirmMktAnnot ? (
                        <MarketAnnotationsDialog
                            onClose={onCloseMktAnnotDialog}
                            onConfirm={onConfirmMktAnnot}
                        />
                    ) : null}
                </div>

                <div className="x-axis-row">
                    <canvas ref={xAxisCanvasRef} className="x-axis-canvas" aria-label="X axis" />
                    <div className="x-axis-spacer" />
                </div>
            </div>
        </main>
    )
}

export default ChartStage