import type { MouseEvent, RefObject, WheelEvent } from 'react'
import DrawMenu from './DrawMenu'
import ObjectsPanel from './ObjectsPanel'
import OhlcBox from './OhlcBox'
import type { Drawing, DrawMenuState, OhlcState, ToolType } from '../chartTypes'

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
}: ChartStageProps) {
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
                    {objectsOpen ? <ObjectsPanel drawings={drawings} onRemove={onRemoveDrawing} onClose={onCloseObjects} /> : null}
                    <OhlcBox ohlc={ohlc} />
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