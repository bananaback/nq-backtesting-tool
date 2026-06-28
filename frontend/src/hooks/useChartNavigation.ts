import type { Dispatch, SetStateAction, RefObject } from 'react'
import type { Timeframe } from '../types/chart'
import type { ChartRuntimeState } from '../types/state'
import { clamp } from '../utils/math'
import { getFirstIndexByDate, getIndexByTime } from '../utils/time'
import { parseCsvText } from '../utils/csv'

type ChartNavigationDeps = {
    runtimeRef: RefObject<ChartRuntimeState>
    currentTfRef: RefObject<Timeframe>
    setCurrentTF: Dispatch<SetStateAction<Timeframe>>
    setJumpDate: Dispatch<SetStateAction<string>>
    drawCanvas: () => void
}

export function createChartNavigation({
    runtimeRef,
    currentTfRef,
    setCurrentTF,
    setJumpDate,
    drawCanvas,
}: ChartNavigationDeps) {
    const changeTimeframe = (nextTF: Timeframe) => {
        const runtime = runtimeRef.current
        const oldTF = currentTfRef.current
        if (nextTF === oldTF) return

        const oldData = runtime.chartData[oldTF]
        const newData = runtime.chartData[nextTF]
        if (oldData.length && newData.length) {
            const centerIndex = Math.floor(runtime.viewStart + runtime.visibleCount / 2)
            const clampedIndex = clamp(centerIndex, 0, oldData.length - 1)
            const centerTime = oldData[clampedIndex].time
            const newCenterIndex = Math.max(0, getIndexByTime(newData, centerTime))
            runtime.viewStart = newCenterIndex - runtime.visibleCount / 2
        }

        runtime.isAutoScaled = true
        currentTfRef.current = nextTF
        setCurrentTF(nextTF)
    }

    const jumpToDate = async (dateStr: string) => {
        const runtime = runtimeRef.current
        const currentTF = currentTfRef.current
        let data = runtime.chartData[currentTF]

        if (!dateStr) {
            window.alert('Pick a date first.')
            return
        }

        let index = getFirstIndexByDate(data, dateStr)
        if (index < 0 && runtime.sourceFiles[currentTF]) {
            const refreshedText = await runtime.sourceFiles[currentTF]!.text()
            const refreshedData = parseCsvText(refreshedText)
            runtime.chartData[currentTF] = refreshedData
            data = refreshedData
            index = getFirstIndexByDate(data, dateStr)
        }

        if (!data.length) {
            window.alert('Load chart data before jumping to a date.')
            return
        }

        if (index < 0) {
            window.alert(`No data found for ${dateStr} on the current timeframe after reloading the source CSV.`)
            return
        }

        const visibleCount = clamp(runtime.visibleCount, 10, Math.max(data.length, 10))
        runtime.visibleCount = visibleCount
        runtime.viewStart = clamp(index - visibleCount / 2, 0, Math.max(data.length - visibleCount, 0))
        runtime.isAutoScaled = true
        setJumpDate(dateStr)
        drawCanvas()
    }

    const jumpToLatest = () => {
        const runtime = runtimeRef.current
        const data = runtime.chartData[currentTfRef.current]
        if (!data.length) return

        let targetIndex = data.length - 1

        // If candle filter is active and hiding after-filter candles,
        // the last visible candle is at the filter boundary
        if (runtime.candleFilterMinute && !runtime.renderAfterFilterMinute) {
            const parts = runtime.candleFilterMinute.split('T')
            if (parts.length === 2) {
                const dateStr = parts[0]
                const timeStr = parts[1]
                const dateStartIndex = getFirstIndexByDate(data, dateStr)
                if (dateStartIndex >= 0) {
                    for (let i = dateStartIndex; i < data.length; i += 1) {
                        const t = data[i].time
                        if (!t.startsWith(dateStr)) break
                        if (t.includes(timeStr)) {
                            targetIndex = i
                            break
                        }
                    }
                    // If no exact time match found, fall back to the last candle of that date
                    if (targetIndex === data.length - 1 && targetIndex > dateStartIndex) {
                        // Scan backward to find last candle of the filtered date
                        for (let i = data.length - 1; i >= dateStartIndex; i -= 1) {
                            if (data[i].time.startsWith(dateStr)) {
                                targetIndex = i
                                break
                            }
                        }
                    }
                }
            }
        }

        const visibleCount = Math.max(10, Math.min(runtime.visibleCount, data.length))
        runtime.visibleCount = visibleCount
        runtime.viewStart = Math.max(0, targetIndex - Math.floor(visibleCount / 2))
        runtime.isAutoScaled = true
        drawCanvas()
    }

    const jumpToMinute = (minuteStr: string) => {
        const runtime = runtimeRef.current

        // Use m1 data for precise minute-level lookup (handles leading-zero mismatch via numeric compare)
        const m1Data = runtime.chartData.m1
        if (!m1Data || !m1Data.length) {
            window.alert('Load M1 chart data first.')
            return
        }

        const parts = minuteStr.split('T')
        if (parts.length !== 2) return

        const dateStr = parts[0]
        const timeStr = parts[1]

        // Parse target time to total minutes (parseInt handles "08" vs "8")
        const targetParts = timeStr.split(':')
        const targetMinutes = parseInt(targetParts[0], 10) * 60 + parseInt(targetParts[1], 10)

        // Find exact candle in m1 by comparing minute-of-day numerically
        let m1Index = -1
        const m1DateStart = getFirstIndexByDate(m1Data, dateStr)
        if (m1DateStart >= 0) {
            for (let i = m1DateStart; i < m1Data.length; i += 1) {
                const t = m1Data[i].time
                if (!t.startsWith(dateStr)) break
                const hhmm = t.includes('T') ? t.split('T')[1].slice(0, 5) : t.slice(11, 16)
                const [h, m] = hhmm.split(':').map(n => parseInt(n, 10))
                if (isNaN(h) || isNaN(m)) continue
                if (h * 60 + m === targetMinutes) {
                    m1Index = i
                    break
                }
            }
        }

        // Map to current timeframe
        const currentData = runtime.chartData[currentTfRef.current]
        if (!currentData.length) {
            window.alert('Load chart data first.')
            return
        }

        let index: number
        if (m1Index >= 0) {
            index = getIndexByTime(currentData, m1Data[m1Index].time)
            if (index < 0) {
                index = getFirstIndexByDate(currentData, dateStr)
            }
        } else {
            index = getFirstIndexByDate(currentData, dateStr)
        }

        if (index < 0) {
            window.alert(`No data found for ${dateStr} on the current timeframe.`)
            return
        }

        const visibleCount = Math.max(10, Math.min(runtime.visibleCount, currentData.length))
        runtime.visibleCount = visibleCount
        runtime.viewStart = Math.max(0, index - visibleCount / 2)
        runtime.viewStart = Math.min(runtime.viewStart, Math.max(currentData.length - visibleCount, 0))
        runtime.isAutoScaled = true
        drawCanvas()
    }

    const jumpToLastCandleOfDate = (dateStr: string) => {
        const runtime = runtimeRef.current
        const data = runtime.chartData[currentTfRef.current]
        if (!data.length) {
            window.alert('Load chart data first.')
            return
        }

        // Normalize to YYYY-MM-DD
        const cleanDate = dateStr.length > 10 ? dateStr.slice(0, 10) : dateStr

        const dateStartIndex = getFirstIndexByDate(data, cleanDate)
        if (dateStartIndex < 0) {
            window.alert(`No data found for ${cleanDate}`)
            return
        }

        // Scan forward to find the last candle on this date
        let lastIndex = dateStartIndex
        for (let i = dateStartIndex + 1; i < data.length; i += 1) {
            if (data[i].time.slice(0, 10) === cleanDate) {
                lastIndex = i
            } else {
                break
            }
        }

        // Cap visibleCount to prevent viewStart overflow when zoomed out
        const visibleCount = Math.max(10, Math.min(runtime.visibleCount, data.length, 200))
        runtime.visibleCount = visibleCount
        runtime.viewStart = Math.max(0, lastIndex - Math.floor(visibleCount / 2))
        runtime.isAutoScaled = true
        drawCanvas()
    }

    return { changeTimeframe, jumpToDate, jumpToLatest, jumpToMinute, jumpToLastCandleOfDate }
}
