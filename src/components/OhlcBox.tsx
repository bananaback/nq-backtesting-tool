import type { OhlcState } from '../chartTypes'

type OhlcBoxProps = {
    ohlc: OhlcState
}

function OhlcBox({ ohlc }: OhlcBoxProps) {
    if (!ohlc.visible) return null

    return (
        <div className="ohlc-box">
            T: <span>{ohlc.time}</span> | O: <span>{ohlc.open.toFixed(2)}</span> | H:{' '}
            <span>{ohlc.high.toFixed(2)}</span> | L: <span>{ohlc.low.toFixed(2)}</span> | C:{' '}
            <span className={ohlc.bullish ? 'bullish' : 'neutral'}>{ohlc.close.toFixed(2)}</span>
        </div>
    )
}

export default OhlcBox