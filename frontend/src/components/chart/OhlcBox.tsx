import type { OhlcState } from '../../types/state'

type OhlcBoxProps = {
    ohlc: OhlcState
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const

function OhlcBox({ ohlc }: OhlcBoxProps) {
    if (!ohlc.visible) return null

    const parsed = new Date(ohlc.time.replace(' ', 'T'))
    const weekdayIndex = parsed.getDay() // 0=Sun, 1=Mon .. 6=Sat; we map Mon=0..Fri=4
    const activeIdx = weekdayIndex >= 1 && weekdayIndex <= 5 ? weekdayIndex - 1 : -1
    const dayOfMonth = parsed.getDate()

    // Week-of-month: Week 1 starts on first Monday of the month.
    // Days before first Monday belong to previous month's last week.
    const firstOfMonth = new Date(parsed.getFullYear(), parsed.getMonth(), 1)
    const firstDow = firstOfMonth.getDay() // 0=Sun
    const firstMondayDate = 1 + (firstDow === 1 ? 0 : (8 - firstDow) % 7)

    let weekOfMonth: number
    if (dayOfMonth >= firstMondayDate) {
        weekOfMonth = Math.floor((dayOfMonth - firstMondayDate) / 7) + 1
    } else {
        // Before first Monday — compute from previous month's first Monday
        const prevMonthLastDay = new Date(parsed.getFullYear(), parsed.getMonth(), 0)
        const prevMonthFirst = new Date(parsed.getFullYear(), parsed.getMonth() - 1, 1)
        const prevFirstDow = prevMonthFirst.getDay()
        const prevFirstMonday = 1 + (prevFirstDow === 1 ? 0 : (8 - prevFirstDow) % 7)
        weekOfMonth = Math.floor((prevMonthLastDay.getDate() - prevFirstMonday) / 7) + 1
    }

    const monthName = parsed.toLocaleDateString(undefined, { month: 'long' })
    const year = parsed.getFullYear()
    const hourMin = ohlc.time.length >= 16 ? ohlc.time.substring(11, 16) : ohlc.time

    return (
        <div className="ohlc-box">
            <div className="ohlc-box__weekdays">
                {WEEKDAYS.map((day, i) => (
                    <span
                        key={day}
                        className={`ohlc-box__day${i === activeIdx ? ' ohlc-box__day--active' : ''}`}
                    >
                        {day}
                    </span>
                ))}
            </div>

            <div className="ohlc-box__badges">
                <span className="ohlc-box__badge">W{weekOfMonth}</span>
                <span className="ohlc-box__badge">{monthName}</span>
                <span className="ohlc-box__badge">{year}</span>
                <span className="ohlc-box__badge">{hourMin}</span>
            </div>

            <div className="ohlc-box__ohlc">
                O <span>{ohlc.open.toFixed(2)}</span>
                {' '}H <span>{ohlc.high.toFixed(2)}</span>
                {' '}L <span>{ohlc.low.toFixed(2)}</span>
                {' '}C{' '}
                <span className={ohlc.bullish ? 'ohlc-box__bullish' : 'ohlc-box__neutral'}>
                    {ohlc.close.toFixed(2)}
                </span>
            </div>
        </div>
    )
}

export default OhlcBox
