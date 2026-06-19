import type { ChangeEvent, JSX } from 'react'
import { useChartContext } from '../../context/ChartContext'
import { TIMEFRAMES } from '../../constants/chart'
import type { Timeframe } from '../../types/chart'
import BacktestSectionModal from '../modals/BacktestSectionModal'

type TopBarProps = {
    isSectionModalOpen: boolean
    onOpenSectionModal: () => void
    onCloseSectionModal: () => void
    onSubmitSection: (name: string, date: string, time: string) => Promise<boolean>
    sectionDefaultName: string
    onHideTopBar: () => void
    onPrepareDayView: () => void
    onExportAllDays: () => void
}

function getTimeframeLabel(tf: Timeframe) {
    if (tf === 'm1') return '1m'
    if (tf === 'm5') return '5m'
    if (tf === 'm15') return '15m'
    return '1h'
}

/**
 * Renders the top bar with timeframe controls, action buttons, date jump,
 * candle filter, CSV load, and the backtest section modal.
 */
function TopBar({
    isSectionModalOpen,
    onOpenSectionModal,
    onCloseSectionModal,
    onSubmitSection,
    sectionDefaultName,
    onHideTopBar,
    onPrepareDayView,
    onExportAllDays,
}: TopBarProps): JSX.Element {
    const ctx = useChartContext()
    return (
        <>
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
                            className={tf === ctx.currentTF ? 'tf-switcher__btn is-active' : 'tf-switcher__btn'}
                            onClick={() => ctx.changeTimeframe(tf)}
                        >
                            {getTimeframeLabel(tf)}
                        </button>
                    ))}
                </div>

                <div className="toolbar-buttons">
                    <button type="button" className={ctx.drawMode ? 'action-btn is-on' : 'action-btn'} onClick={ctx.toggleDrawMode}>
                        {ctx.drawMode ? '✏️ Draw: ON' : '✏️ Draw: OFF'}
                    </button>
                    <button type="button" className={ctx.showDaySeparators ? 'action-btn is-on' : 'action-btn'} onClick={ctx.toggleDaySeparators}>
                        {ctx.showDaySeparators ? '⋮ Day Lines: ON' : '⋮ Day Lines: OFF'}
                    </button>
                    <button type="button" className="action-btn" onClick={() => ctx.setObjectsOpen(v => !v)}>
                        {ctx.objectsOpen ? '📋 Objects: OPEN' : '📋 Objects'}
                    </button>
                    <button type="button" className="action-btn" onClick={onOpenSectionModal}>
                        📌 New Section
                    </button>
                </div>

                <form
                    className="date-jump"
                    onSubmit={(event) => {
                        event.preventDefault()
                        ctx.jumpToDate(ctx.jumpDate)
                    }}
                >
                    <label className="date-jump__label" htmlFor="chart-jump-date">
                        Jump to date
                    </label>
                    <input
                        id="chart-jump-date"
                        className="date-jump__input"
                        type="date"
                        value={ctx.jumpDate}
                        onChange={(event) => ctx.setJumpDate(event.target.value)}
                    />
                    <button type="submit" className="date-jump__btn">
                        Go
                    </button>
                </form>

                <div className="candle-filter" aria-label="Candle render filter">
                    <span className="candle-filter__label">Candles after</span>
                    <button
                        type="button"
                        className={ctx.isPickingCandleFilter ? 'candle-filter__pick is-on' : 'candle-filter__pick'}
                        onClick={ctx.startCandleFilterPick}
                    >
                        {ctx.isPickingCandleFilter ? 'Picking… click candle' : 'Pick Candle'}
                    </button>
                    <span className="candle-filter__selected">{ctx.candleFilterMinute ? ctx.candleFilterMinute.replace('T', ' ') : 'No candle selected'}</span>
                    <button
                        type="button"
                        className="candle-filter__step"
                        onClick={() => ctx.shiftCandleFilterMinute(-1)}
                        disabled={!ctx.candleFilterMinute}
                    >
                        Prev
                    </button>
                    <button
                        type="button"
                        className="candle-filter__step"
                        onClick={() => ctx.shiftCandleFilterMinute(1)}
                        disabled={!ctx.candleFilterMinute}
                    >
                        Next
                    </button>
                    <button
                        type="button"
                        className={ctx.renderAfterFilterMinute ? 'candle-filter__toggle is-on' : 'candle-filter__toggle'}
                        onClick={() => ctx.setRenderAfterFilterMinute(!ctx.renderAfterFilterMinute)}
                        disabled={!ctx.candleFilterMinute}
                    >
                        {ctx.renderAfterFilterMinute ? 'After: Show' : 'After: Hide'}
                    </button>
                </div>

                <label className="file-input">
                    <input
                        type="file"
                        accept=".csv"
                        multiple
                        onChange={(event: ChangeEvent<HTMLInputElement>) => ctx.loadCsvFiles(event.target.files)}
                    />
                    <span>Load CSVs</span>
                </label>

                <button type="button" className="action-btn" onClick={onHideTopBar}>
                    Hide Top Bar
                </button>
                <button type="button" className="action-btn action-btn--primary" onClick={onPrepareDayView}>
                    📅 Prepare Day
                </button>
                <button type="button" className="action-btn action-btn--primary" onClick={onExportAllDays}>
                    📦 Export All Days
                </button>
            </div>
            <div className="topbar__hint">Drag to pan • Scroll to zoom • Drag right scale to Y-zoom</div>
        </header>
        {isSectionModalOpen ? (
            <BacktestSectionModal
                defaultName={sectionDefaultName}
                onClose={onCloseSectionModal}
                onSubmit={onSubmitSection}
            />
        ) : null}
    </>
    )
}

export default TopBar
