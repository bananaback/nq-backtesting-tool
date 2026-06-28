import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { Timeframe } from '../types/chart'
import type { ChartRuntimeState } from '../types/state'
import type { Drawing } from '../types/drawings/index'
import { loadNewsData, generateNewsDrawings } from '../services/marketAnnotationService'
import { findNewsByDateRange, getIndexByTime } from '../utils/time'

type MarketAnnotationActionsDeps = {
    runtimeRef: RefObject<ChartRuntimeState>
    currentTfRef: RefObject<Timeframe>
    setDrawings: Dispatch<SetStateAction<Drawing[]>>
    setMktAnnotDialogOpen: Dispatch<SetStateAction<boolean>>
    drawCanvas: () => void
}

export function createMarketAnnotationActions({
    runtimeRef,
    currentTfRef,
    setDrawings,
    setMktAnnotDialogOpen,
    drawCanvas,
}: MarketAnnotationActionsDeps) {
    const confirmMarketAnnotations = async (dateStr: string) => {
        const runtime = runtimeRef.current
        const data = runtime.chartData[currentTfRef.current]

        if (!data.length) {
            window.alert('Load chart data before adding news annotations.')
            return
        }

        // Load news data (cached internally by loadNewsData)
        const allNews = await loadNewsData()
        if (!allNews.length) {
            window.alert('No news data available. Ensure ff_calendar.json is present in the public folder.')
            return
        }

        // Store in runtime for future use
        runtime.newsData = allNews

        // Find news for the selected date using binary search
        const dateNews = findNewsByDateRange(allNews, dateStr, dateStr)
        if (!dateNews.length) {
            window.alert(`No news events found for ${dateStr}.`)
            return
        }

        // Generate NewsDrawing objects
        const newsDrawings = generateNewsDrawings(
            dateNews,
            dateStr,
            data,
            runtime.drawingIdCounter + 1,
        )

        if (!newsDrawings.length) {
            window.alert(`Could not match any news events to candles for ${dateStr}. Try a different timeframe.`)
            return
        }

        // Update drawing ID counter
        runtime.drawingIdCounter += newsDrawings.length

        // Add to drawings array
        const updatedDrawings = [...runtime.drawings, ...newsDrawings]
        setDrawings(updatedDrawings)

        // Jump to the first news event's candle
        const firstNewsCandle = newsDrawings[0]
        const dataIndex = getIndexByTime(data, firstNewsCandle.time)
        if (dataIndex >= 0) {
            runtime.viewStart = Math.max(0, dataIndex - Math.floor(runtime.visibleCount / 3))
        }

        setMktAnnotDialogOpen(false)
        drawCanvas()
    }

    const closeMktAnnotDialog = () => {
        setMktAnnotDialogOpen(false)
    }

    return { confirmMarketAnnotations, closeMktAnnotDialog }
}
