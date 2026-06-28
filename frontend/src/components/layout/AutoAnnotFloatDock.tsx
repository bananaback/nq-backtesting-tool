import type { JSX } from 'react'

type AutoAnnotFloatDockProps = {
    jumpDate: string
    jumpToDate: (date: string) => void
    onPrevDay: () => void
    onNextDay: () => void
}

function AutoAnnotFloatDock({
    jumpDate,
    jumpToDate,
    onPrevDay,
    onNextDay,
}: AutoAnnotFloatDockProps): JSX.Element {
    return (
        <div className="backtest-float-dock" aria-label="Auto annotation controls">
            <button
                type="button"
                className="backtest-float-dock__btn"
                onClick={onPrevDay}
                title="Previous trading day"
            >
                ◀ Prev Day
            </button>
            <button
                type="button"
                className="backtest-float-dock__btn"
                onClick={() => { if (jumpDate) jumpToDate(jumpDate) }}
                title="Jump back to current annotated day"
            >
                📍 Current
            </button>
            <button
                type="button"
                className="backtest-float-dock__btn"
                onClick={onNextDay}
                title="Next trading day"
            >
                Next Day ▶
            </button>
        </div>
    )
}

export default AutoAnnotFloatDock
