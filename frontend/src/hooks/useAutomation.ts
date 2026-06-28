import { useEffect, type RefObject } from 'react'
import type { ChartRuntimeState } from '../types/state'

export function useChartAutomation(
    chartCanvasRef: RefObject<HTMLCanvasElement | null>,
    yAxisCanvasRef: RefObject<HTMLCanvasElement | null>,
    xAxisCanvasRef: RefObject<HTMLCanvasElement | null>,
    runtimeRef: RefObject<ChartRuntimeState>,
    drawCanvas: () => void,
    prepareDayView: (dateStr: string) => Promise<void>,
): void {
    useEffect(() => {
        const w = window as unknown as {
            __chartAPI?: {
                prepareDayView: (dateStr: string) => Promise<void>
                captureChartAsBlob: () => Promise<Blob | null>
                getAllDates: () => string[]
                prepareDay: (dateStr: string) => Promise<void>
                captureChart: () => Promise<Blob | null>
                getAvailableDates: () => string[]
            }
        }

        const captureChartAsBlob = () => new Promise<Blob | null>((resolve) => {
            const chartCanvas = chartCanvasRef.current
            const yAxisCanvas = yAxisCanvasRef.current
            const xAxisCanvas = xAxisCanvasRef.current
            if (!chartCanvas || !yAxisCanvas || !xAxisCanvas) {
                resolve(null)
                return
            }
            // Temporarily hide crosshair
            const hadCrosshair = runtimeRef.current.crosshairActive
            runtimeRef.current.crosshairActive = false
            drawCanvas()

            // Wait for render, then capture
            requestAnimationFrame(() => {
                const width = chartCanvas.width + yAxisCanvas.width
                const height = chartCanvas.height + xAxisCanvas.height
                const offscreen = document.createElement('canvas')
                offscreen.width = width
                offscreen.height = height
                const ctx = offscreen.getContext('2d')
                if (!ctx) {
                    resolve(null)
                    return
                }
                ctx.drawImage(chartCanvas, 0, 0)
                ctx.drawImage(yAxisCanvas, chartCanvas.width, 0)
                ctx.drawImage(xAxisCanvas, 0, chartCanvas.height)

                // Restore crosshair
                if (hadCrosshair) {
                    runtimeRef.current.crosshairActive = true
                    drawCanvas()
                }

                offscreen.toBlob(resolve, 'image/png')
            })
        })

        const getAllDates = () => {
            const data = runtimeRef.current.chartData.m1
            const dates = new Set<string>()
            for (const candle of data) {
                dates.add(candle.time.slice(0, 10))
            }
            return Array.from(dates).sort()
        }

        w.__chartAPI = {
            // Original API (must remain for backwards compatibility)
            prepareDayView,
            captureChartAsBlob,
            getAllDates,
            // Improved new names
            prepareDay: (dateStr: string) => prepareDayView(dateStr),
            captureChart: captureChartAsBlob,
            getAvailableDates: getAllDates,
        }

        return () => {
            delete w.__chartAPI
        }
    }, [prepareDayView, chartCanvasRef, yAxisCanvasRef, xAxisCanvasRef, runtimeRef, drawCanvas])
}
