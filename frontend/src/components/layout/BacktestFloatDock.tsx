import type { JSX } from 'react'
import type { Timeframe } from '../../types/chart'

type BacktestFloatDockProps = {
    currentTF: Timeframe
    changeTimeframe: (tf: Timeframe) => void
    isPickingCandleFilter: boolean
    startCandleFilterPick: () => void
    candleFilterMinute: string
    shiftCandleFilterMinute: (deltaMinutes: number) => void
    renderAfterFilterMinute: boolean
    setRenderAfterFilterMinute: (v: boolean) => void
}

const TFS = ['m1', 'm5', 'm15', 'h1'] as const

function tfLabel(tf: typeof TFS[number]): string {
    return tf === 'm1' ? '1m' : tf === 'm5' ? '5m' : tf === 'm15' ? '15m' : '1h'
}

function BacktestFloatDock({
    currentTF,
    changeTimeframe,
    isPickingCandleFilter,
    startCandleFilterPick,
    candleFilterMinute,
    shiftCandleFilterMinute,
    renderAfterFilterMinute,
    setRenderAfterFilterMinute,
}: BacktestFloatDockProps): JSX.Element {
    return (
        <div className="backtest-float-dock" aria-label="Backtest controls">
            <div className="backtest-float-dock__tf" role="tablist" aria-label="Timeframes">
                {TFS.map((tf) => (
                    <button
                        key={tf}
                        type="button"
                        className={currentTF === tf ? 'backtest-float-dock__btn is-on' : 'backtest-float-dock__btn'}
                        onClick={() => changeTimeframe(tf)}
                    >
                        {tfLabel(tf)}
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

            <span className="backtest-float-dock__selected">
                {candleFilterMinute ? candleFilterMinute.replace('T', ' ') : 'No candle selected'}
            </span>

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
    )
}

export default BacktestFloatDock
