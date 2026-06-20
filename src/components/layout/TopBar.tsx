import type { ChangeEvent, JSX } from 'react'
import { useChartContext } from '../../context/ChartContext'
import { TIMEFRAMES } from '../../constants/chart'
import type { Timeframe } from '../../types/chart'
import BacktestSectionModal from '../modals/BacktestSectionModal'

type TopBarProps = {
    isSectionModalOpen: boolean
    isBacktestMode: boolean
    isAutoAnnotMode: boolean
    onToggleBacktest: () => void
    onToggleAutoAnnot: () => void
    onCloseSectionModal: () => void
    onSubmitSection: (name: string, date: string, time: string) => Promise<boolean>
    sectionDefaultName: string
    onHideTopBar: () => void
}

function getTimeframeLabel(tf: Timeframe) {
    if (tf === 'm1') return '1m'
    if (tf === 'm5') return '5m'
    if (tf === 'm15') return '15m'
    return '1h'
}

/**
 * Renders the top bar with timeframe controls, action buttons, CSV load,
 * and the backtest section modal.
 */
function TopBar({
    isSectionModalOpen,
    isBacktestMode,
    isAutoAnnotMode,
    onToggleBacktest,
    onToggleAutoAnnot,
    onCloseSectionModal,
    onSubmitSection,
    sectionDefaultName,
    onHideTopBar,
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
                    <button type="button" className={ctx.drawMode ? 'action-btn is-on' : 'action-btn'} onClick={ctx.toggleDrawMode} title={ctx.drawMode ? 'Draw: ON' : 'Draw: OFF'}>
                        ✏️
                    </button>
                    <button type="button" className={ctx.showDaySeparators ? 'action-btn is-on' : 'action-btn'} onClick={ctx.toggleDaySeparators} title={ctx.showDaySeparators ? 'Day Lines: ON' : 'Day Lines: OFF'}>
                        ⋮
                    </button>
                    <button type="button" className={ctx.objectsOpen ? 'action-btn is-on' : 'action-btn'} onClick={() => ctx.setObjectsOpen(v => !v)} title={ctx.objectsOpen ? 'Objects: OPEN' : 'Objects'}>
                        📋
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

                <button type="button" className={isBacktestMode ? 'action-btn is-on' : 'action-btn'} onClick={onToggleBacktest}>
                    {isBacktestMode ? '📌 Backtest: ON' : '📌 New Backtest'}
                </button>
                <button type="button" className={isAutoAnnotMode ? 'action-btn is-on' : 'action-btn'} onClick={onToggleAutoAnnot}>
                    {isAutoAnnotMode ? '📅 Auto Annot: ON' : '📅 Auto Annotations'}
                </button>
            </div>

            <button type="button" className="topbar__fullscreen-btn" onClick={onHideTopBar} title="Fullscreen (hide top bar)">
                ⛶
            </button>
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
