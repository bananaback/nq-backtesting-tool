import DrawMenu from '../drawing/DrawMenu'
import DrawingLengthModal from '../drawing/DrawingLengthModal'
import FibSetupModal from '../drawing/FibSetupModal'
import MarketAnnotationsDialog from '../modals/MarketAnnotationsDialog'
import ObjectsPanel from '../drawing/ObjectsPanel'
import OhlcBox from './OhlcBox'
import type { Drawing, FibDrawing } from '../../types/chart'
import { useChartContext } from '../../context/ChartContext'

type ChartStageProps = {
    lengthEditorDrawing?: Drawing | null
    onEditDrawing?: (drawing: Drawing) => void
    onCloseLengthEditor?: () => void
    onSaveDrawingLength?: (drawingId: number, lengthMinutes: number | null) => void
    fibSetupDrawing?: Drawing | null
    onCloseFibSetup?: () => void
    onSaveFibSetup?: (drawingId: number, updates: Pick<FibDrawing, 'templateKey' | 'extendRight' | 'reverse' | 'lineStyle' | 'lineWidth' | 'levels'>) => void
}

function ChartStage({ lengthEditorDrawing, onEditDrawing, onCloseLengthEditor, onSaveDrawingLength, fibSetupDrawing, onCloseFibSetup, onSaveFibSetup }: ChartStageProps) {
    const ctx = useChartContext()
    const fibSetupDrawingForModal = fibSetupDrawing && fibSetupDrawing.type === 'FIB' ? fibSetupDrawing as FibDrawing : null

    return (
        <main className="workspace">
            <div className="chart-stage" ref={ctx.chartStageRef}>
                <div className="chart-row">
                    <canvas
                        ref={ctx.chartCanvasRef}
                        className="chart-canvas"
                        onMouseDown={ctx.handleChartMouseDown}
                        onWheel={ctx.handleChartWheel}
                        onMouseLeave={ctx.handleChartMouseLeave}
                        aria-label="Candlestick chart"
                    />

                    <canvas
                        ref={ctx.yAxisCanvasRef}
                        className="y-axis-canvas"
                        onMouseDown={ctx.handleYAxisMouseDown}
                        onDoubleClick={ctx.handleYAxisDoubleClick}
                        aria-label="Y axis"
                    />

                    {ctx.drawMenu ? <DrawMenu position={ctx.drawMenu} onCreateDrawing={ctx.createDrawing} /> : null}
                    {ctx.objectsOpen ? <ObjectsPanel drawings={ctx.drawings} onRemove={ctx.removeDrawing} onClose={() => ctx.setObjectsOpen(false)} selectedDrawingId={ctx.selectedDrawingId} onSelect={ctx.setSelectedDrawingId} onEditDrawing={onEditDrawing} /> : null}
                    <OhlcBox ohlc={ctx.ohlc} />
                    {ctx.fibPlacementStep && !ctx.drawMenu ? (
                        <div className="fib-placement-hint">
                            <div className="fib-placement-hint__title">Fibonacci</div>
                            <div className="fib-placement-hint__text">
                                {ctx.fibPlacementStep === 'pick-first' ? 'Click the first anchor point.' : 'Click the second anchor point.'}
                            </div>
                            <button type="button" className="fib-placement-hint__cancel" onClick={ctx.cancelFibPlacement}>
                                Cancel
                            </button>
                        </div>
                    ) : null}
                    {ctx.entryPlacementStep && !ctx.drawMenu ? (
                        <div className="entry-placement-hint">
                            <div className="entry-placement-hint__title">
                                Entry
                            </div>
                            <div className="entry-placement-hint__text">
                                {ctx.entryPlacementStep === 'pick-entry' ? 'Click the entry price on the chart.' : ctx.entryPlacementStep === 'pick-sl' ? 'Click the stop loss price on the chart.' : ctx.entryPlacementStep === 'pick-tp' ? 'Click the take profit price on the chart.' : 'Click to set the entry width on the chart.'}
                            </div>
                            <button type="button" className="entry-placement-hint__cancel" onClick={ctx.cancelEntryPlacement}>
                                Cancel
                            </button>
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
                    {ctx.mktAnnotDialogOpen ? (
                        <MarketAnnotationsDialog
                            onClose={ctx.closeMktAnnotDialog}
                            onConfirm={ctx.confirmMarketAnnotations}
                        />
                    ) : null}
                </div>

                <div className="x-axis-row">
                    <canvas ref={ctx.xAxisCanvasRef} className="x-axis-canvas" aria-label="X axis" />
                    <div className="x-axis-spacer" />
                </div>
            </div>
        </main>
    )
}

export default ChartStage
