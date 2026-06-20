import type { RefObject } from 'react'
import type { ChartRuntimeState, Timeframe } from '../chartTypes'
import { parseCsvText } from '../chartUtils'
import { saveCsvCache } from '../utils/csvCache'

type LoadTradingChartCsvFilesDeps = {
    runtimeRef: RefObject<ChartRuntimeState>
    currentTfRef: RefObject<Timeframe>
    drawCanvas: () => void
    setChartLoading: (v: boolean) => void
}

export function createLoadCsvFiles({ runtimeRef, currentTfRef, drawCanvas, setChartLoading }: LoadTradingChartCsvFilesDeps) {
    return (files: FileList | null) => {
        if (!files?.length) return

        setChartLoading(true)

        // Defer file reading so React paints the spinner before heavy work blocks the main thread
        requestAnimationFrame(() => {
            let processed = 0
            const cachedEntries: Array<{ name: string; text: string }> = []
            Array.from(files).forEach((file) => {
                const reader = new FileReader()
                reader.onload = (event) => {
                    const text = String(event.target?.result ?? '')
                    const parsedData = parseCsvText(text)

                    const tfMatch = file.name.match(/_(m1|m5|m15|h1)\./i)
                    const tf = (tfMatch?.[1].toLowerCase() as Timeframe) || currentTfRef.current

                    runtimeRef.current.sourceFiles[tf] = file
                    runtimeRef.current.chartData[tf] = parsedData
                    processed += 1
                    cachedEntries.push({ name: file.name, text })

                    if (processed === files.length) {
                        const currentData = runtimeRef.current.chartData[currentTfRef.current]
                        if (currentData.length > 0) {
                            runtimeRef.current.visibleCount = Math.min(100, currentData.length)
                            runtimeRef.current.viewStart = Math.max(0, currentData.length - runtimeRef.current.visibleCount)
                            runtimeRef.current.isAutoScaled = true
                        }

                        drawCanvas()

                        // Persist to IndexedDB cache for auto-restore next session
                        saveCsvCache(cachedEntries).finally(() => {
                            // Wait for browser paint pipeline + minimum display time
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                    setTimeout(() => {
                                        setChartLoading(false)
                                    }, 250)
                                })
                            })
                        })
                    }
                }

                reader.readAsText(file)
            })
        })
    }
}
