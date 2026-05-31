import type { ChangeEvent } from 'react'
import { TIMEFRAMES, type Timeframe } from '../chartTypes'

type TopBarProps = {
    currentTF: Timeframe
    jumpDate: string
    drawMode: boolean
    showDaySeparators: boolean
    objectsOpen: boolean
    candleFilterMinute: string
    renderAfterFilterMinute: boolean
    isPickingCandleFilter: boolean
    onTimeframeChange: (nextTF: Timeframe) => void
    onJumpDateChange: (value: string) => void
    onJumpToDate: () => void
    onToggleDrawMode: () => void
    onToggleDaySeparators: () => void
    onToggleObjects: () => void
    onLoadCsvFiles: (files: FileList | null) => void
    onRenderAfterFilterMinuteChange: (value: boolean) => void
    onStepCandleFilterMinute: (deltaMinutes: number) => void
    onStartCandleFilterPick: () => void
    onHideTopBar: () => void
}

function getTimeframeLabel(tf: Timeframe) {
    if (tf === 'm1') return '1m'
    if (tf === 'm5') return '5m'
    if (tf === 'm15') return '15m'
    return '1h'
}

function TopBar({
    currentTF,
    jumpDate,
    drawMode,
    showDaySeparators,
    objectsOpen,
    candleFilterMinute,
    renderAfterFilterMinute,
    isPickingCandleFilter,
    onTimeframeChange,
    onJumpDateChange,
    onJumpToDate,
    onToggleDrawMode,
    onToggleDaySeparators,
    onToggleObjects,
    onLoadCsvFiles,
    onRenderAfterFilterMinuteChange,
    onStepCandleFilterMinute,
    onStartCandleFilterPick,
    onHideTopBar,
}: TopBarProps) {
    return (
        <header className="topbar">
            <div className="topbar__group">
                <div className="brand-block">
                    <div className="brand-title">TradingView MVP</div>
                    <div className="brand-subtitle">Unified objects and multi-timeframe canvas</div>
                </div>

                <div className="tf-switcher" role="tablist" aria-label="Timeframes">
                    {TIMEFRAMES.map((tf) => (
                        <button
                            key={tf}
                            type="button"
                            className={tf === currentTF ? 'tf-switcher__btn is-active' : 'tf-switcher__btn'}
                            onClick={() => onTimeframeChange(tf)}
                        >
                            {getTimeframeLabel(tf)}
                        </button>
                    ))}
                </div>

                <div className="toolbar-buttons">
                    <button type="button" className={drawMode ? 'action-btn is-on' : 'action-btn'} onClick={onToggleDrawMode}>
                        {drawMode ? '✏️ Draw: ON' : '✏️ Draw: OFF'}
                    </button>
                    <button type="button" className={showDaySeparators ? 'action-btn is-on' : 'action-btn'} onClick={onToggleDaySeparators}>
                        {showDaySeparators ? '⋮ Day Lines: ON' : '⋮ Day Lines: OFF'}
                    </button>
                    <button type="button" className="action-btn" onClick={onToggleObjects}>
                        {objectsOpen ? '📋 Objects: OPEN' : '📋 Objects'}
                    </button>
                </div>

                <form
                    className="date-jump"
                    onSubmit={(event) => {
                        event.preventDefault()
                        onJumpToDate()
                    }}
                >
                    <label className="date-jump__label" htmlFor="chart-jump-date">
                        Jump to date
                    </label>
                    <input
                        id="chart-jump-date"
                        className="date-jump__input"
                        type="date"
                        value={jumpDate}
                        onChange={(event) => onJumpDateChange(event.target.value)}
                    />
                    <button type="submit" className="date-jump__btn">
                        Go
                    </button>
                </form>

                <div className="candle-filter" aria-label="Candle render filter">
                    <span className="candle-filter__label">Candles after</span>
                    <button
                        type="button"
                        className={isPickingCandleFilter ? 'candle-filter__pick is-on' : 'candle-filter__pick'}
                        onClick={onStartCandleFilterPick}
                    >
                        {isPickingCandleFilter ? 'Picking… click candle' : 'Pick Candle'}
                    </button>
                    <span className="candle-filter__selected">{candleFilterMinute ? candleFilterMinute.replace('T', ' ') : 'No candle selected'}</span>
                    <button
                        type="button"
                        className="candle-filter__step"
                        onClick={() => onStepCandleFilterMinute(-1)}
                        disabled={!candleFilterMinute}
                    >
                        Prev
                    </button>
                    <button
                        type="button"
                        className="candle-filter__step"
                        onClick={() => onStepCandleFilterMinute(1)}
                        disabled={!candleFilterMinute}
                    >
                        Next
                    </button>
                    <button
                        type="button"
                        className={renderAfterFilterMinute ? 'candle-filter__toggle is-on' : 'candle-filter__toggle'}
                        onClick={() => onRenderAfterFilterMinuteChange(!renderAfterFilterMinute)}
                        disabled={!candleFilterMinute}
                    >
                        {renderAfterFilterMinute ? 'After: Show' : 'After: Hide'}
                    </button>
                </div>

                <label className="file-input">
                    <input
                        type="file"
                        accept=".csv"
                        multiple
                        onChange={(event: ChangeEvent<HTMLInputElement>) => onLoadCsvFiles(event.target.files)}
                    />
                    <span>Load CSVs</span>
                </label>

                <button type="button" className="action-btn" onClick={onHideTopBar}>
                    Hide Top Bar
                </button>
            </div>
            <div className="topbar__hint">Drag to pan • Scroll to zoom • Drag right scale to Y-zoom</div>
        </header>
    )
}

export default TopBar