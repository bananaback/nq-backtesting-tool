import type { RefObject } from 'react'
import type { ChartRuntimeState } from '../types/state'

type ExportDeps = {
    runtimeRef: RefObject<ChartRuntimeState>
    chartCanvasRef: RefObject<HTMLCanvasElement | null>
    yAxisCanvasRef: RefObject<HTMLCanvasElement | null>
    xAxisCanvasRef: RefObject<HTMLCanvasElement | null>
    drawCanvas: () => void
    prepareDayView: (dateStr: string) => Promise<void>
}

export function createExport({
    runtimeRef,
    chartCanvasRef,
    yAxisCanvasRef,
    xAxisCanvasRef,
    drawCanvas,
    prepareDayView,
}: ExportDeps) {
    /**
     * Export all trading days as annotated chart images.
     * Iterates through all dates in m1 data, prepares each day view, captures canvas, downloads image.
     */
    const exportAllDays = async (): Promise<void> => {
        const m1Data = runtimeRef.current.chartData.m1
        if (!m1Data || m1Data.length === 0) {
            window.alert('Load M1 data first.')
            return
        }

        // Get all unique dates
        const dateSet = new Set<string>()
        for (const candle of m1Data) {
            dateSet.add(candle.time.slice(0, 10))
        }
        const dates = Array.from(dateSet).sort()

        if (dates.length === 0) {
            window.alert('No dates found in M1 data.')
            return
        }

        console.log(`Exporting ${dates.length} days...`)

        for (let i = 0; i < dates.length; i++) {
            const date = dates[i]
            console.log(`[${i + 1}/${dates.length}] ${date}`)

            // Prepare day view
            await prepareDayView(date)

            // Wait for render
            await new Promise((resolve) => setTimeout(resolve, 300))

            // Capture and download
            const chartCanvas = chartCanvasRef.current
            const yAxisCanvas = yAxisCanvasRef.current
            const xAxisCanvas = xAxisCanvasRef.current

            if (chartCanvas && yAxisCanvas && xAxisCanvas) {
                // Hide crosshair for clean capture
                const hadCrosshair = runtimeRef.current.crosshairActive
                runtimeRef.current.crosshairActive = false
                drawCanvas()

                await new Promise((resolve) => setTimeout(resolve, 100))

                // Capture to blob and download
                const width = chartCanvas.width + yAxisCanvas.width
                const height = chartCanvas.height + xAxisCanvas.height
                const offscreen = document.createElement('canvas')
                offscreen.width = width
                offscreen.height = height
                const ctx = offscreen.getContext('2d')

                if (ctx) {
                    ctx.drawImage(chartCanvas, 0, 0)
                    ctx.drawImage(yAxisCanvas, chartCanvas.width, 0)
                    ctx.drawImage(xAxisCanvas, 0, chartCanvas.height)

                    offscreen.toBlob((blob) => {
                        if (blob) {
                            const url = URL.createObjectURL(blob)
                            const anchor = document.createElement('a')
                            anchor.href = url
                            anchor.download = `${date}.png`
                            document.body.appendChild(anchor)
                            anchor.click()
                            document.body.removeChild(anchor)
                            URL.revokeObjectURL(url)
                        }
                    }, 'image/png')
                }

                // Restore crosshair
                if (hadCrosshair) {
                    runtimeRef.current.crosshairActive = true
                    drawCanvas()
                }
            }

            // Wait between downloads to avoid browser blocking
            await new Promise((resolve) => setTimeout(resolve, 500))
        }

        console.log('Export complete!')
        window.alert(`Exported ${dates.length} days.`)
    }

    return { exportAllDays }
}
