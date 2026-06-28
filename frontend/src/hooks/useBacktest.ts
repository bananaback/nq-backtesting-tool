import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { Candle, Timeframe } from '../types/chart'
import type { ChartRuntimeState } from '../types/state'
import { clamp } from '../utils/math'
import { getFirstIndexByDate, roundTimeToTimeframe } from '../utils/time'
import { parseCsvText } from '../utils/csv'

type BacktestDeps = {
    runtimeRef: RefObject<ChartRuntimeState>
    currentTfRef: RefObject<Timeframe>
    setJumpDate: Dispatch<SetStateAction<string>>
    setCandleFilterMinute?: Dispatch<SetStateAction<string>>
    setRenderAfterFilterMinute?: Dispatch<SetStateAction<boolean>>
    drawCanvas: () => void
}

export function createBacktest({
    runtimeRef,
    currentTfRef,
    setJumpDate,
    setCandleFilterMinute,
    setRenderAfterFilterMinute,
    drawCanvas,
}: BacktestDeps) {
    const addBacktestSection = async (dateStr: string, timeStr: string): Promise<boolean> => {
        const runtime = runtimeRef.current
        const currentTF = currentTfRef.current
        let data = runtime.chartData[currentTF]

        if (!data.length) {
            window.alert('Load chart data before adding a backtest section.')
            return false
        }

        const roundedTimeStr = roundTimeToTimeframe(timeStr, currentTF)

        // Find the first candle for this date, then scan linearly for the specific time.
        // Uses the same date-first approach as jumpToDate (via getFirstIndexByDate) rather
        // than binary search on exact time, because binary search is fragile with unsorted
        // data and varying separator formats.
        const findIndexByDateAndTime = (candles: Candle[], date: string, time: string): number => {
            const dateStartIndex = getFirstIndexByDate(candles, date)
            if (dateStartIndex < 0) return -1
            for (let i = dateStartIndex; i < candles.length; i += 1) {
                const t = candles[i].time
                if (!t.startsWith(date)) break
                if (t.includes(time)) return i
            }
            return -1
        }

        let index = findIndexByDateAndTime(data, dateStr, roundedTimeStr)

        if (index < 0 && runtime.sourceFiles[currentTF]) {
            const refreshedText = await runtime.sourceFiles[currentTF]!.text()
            const refreshedData = parseCsvText(refreshedText)
            runtime.chartData[currentTF] = refreshedData
            data = refreshedData
            index = findIndexByDateAndTime(data, dateStr, roundedTimeStr)
        }

        if (index < 0) {
            window.alert(`No data found for ${dateStr} at ${roundedTimeStr} on the current timeframe.`)
            return false
        }

        const visibleCount = clamp(runtime.visibleCount, 10, Math.max(data.length, 10))
        runtime.visibleCount = visibleCount
        runtime.viewStart = clamp(index - visibleCount / 2, 0, Math.max(data.length - visibleCount, 0))
        runtime.isAutoScaled = true

        const filterValue = `${dateStr}T${roundedTimeStr}`
        runtime.candleFilterMinute = filterValue
        runtime.renderAfterFilterMinute = false
        setJumpDate(dateStr)
        setCandleFilterMinute && setCandleFilterMinute(filterValue)
        setRenderAfterFilterMinute && setRenderAfterFilterMinute(false)
        drawCanvas()

        return true
    }

    return { addBacktestSection }
}
