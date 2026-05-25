import type { Dispatch, RefObject, SetStateAction, MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from 'react'
import type { ChartRuntimeState, Drawing, DrawingDraft, DrawMenuState, Timeframe, ToolType } from '../chartTypes'
import { clamp, getFirstIndexByDate, getIndexByTime, parseCsvText } from '../chartUtils'
import { createLoadCsvFiles } from './loadTradingChartCsvFiles'

type TradingChartActionsDeps = {
    chartCanvasRef: RefObject<HTMLCanvasElement | null>
    runtimeRef: RefObject<ChartRuntimeState>
    currentTfRef: RefObject<Timeframe>
    drawModeRef: RefObject<boolean>
    drawMenuOpenRef: RefObject<boolean>
    setCurrentTF: Dispatch<SetStateAction<Timeframe>>
    setJumpDate: Dispatch<SetStateAction<string>>
    setDrawMode: Dispatch<SetStateAction<boolean>>
    setDrawMenu: Dispatch<SetStateAction<DrawMenuState>>
    setDrawings: Dispatch<SetStateAction<Drawing[]>>
    drawCanvas: () => void
}

export function createTradingChartActions({
    chartCanvasRef,
    runtimeRef,
    currentTfRef,
    drawModeRef,
    drawMenuOpenRef,
    setCurrentTF,
    setJumpDate,
    setDrawMode,
    setDrawMenu,
    setDrawings,
    drawCanvas,
}: TradingChartActionsDeps) {
    const handleChartMouseDown = (event: ReactMouseEvent<HTMLCanvasElement>) => {
        const runtime = runtimeRef.current
        runtime.mouseDownX = event.clientX
        runtime.mouseDownY = event.clientY

        if (!drawMenuOpenRef.current) {
            runtime.isDraggingChart = true
            runtime.lastX = event.clientX
            runtime.lastY = event.clientY
            if (chartCanvasRef.current) chartCanvasRef.current.style.cursor = 'grabbing'
            drawCanvas()
        }
    }

    const handleChartWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
        event.preventDefault()
        if (drawMenuOpenRef.current) return

        const chartCanvas = chartCanvasRef.current
        if (!chartCanvas) return

        const runtime = runtimeRef.current
        const data = runtime.chartData[currentTfRef.current]
        if (!data.length) return

        const zoomFactor = event.nativeEvent.deltaY > 0 ? 1.1 : 0.9
        const ratio = event.nativeEvent.offsetX / chartCanvas.width
        const indexAtMouse = runtime.viewStart + runtime.visibleCount * ratio

        runtime.visibleCount *= zoomFactor
        runtime.visibleCount = clamp(runtime.visibleCount, 10, Math.max(data.length * 2, 10))
        runtime.viewStart = indexAtMouse - runtime.visibleCount * ratio
        drawCanvas()
    }

    const handleChartMouseLeave = () => {
        runtimeRef.current.crosshairActive = false
        if (!runtimeRef.current.isDraggingChart) drawCanvas()
    }

    const handleYAxisMouseDown = (event: ReactMouseEvent<HTMLCanvasElement>) => {
        runtimeRef.current.isDraggingAxis = true
        runtimeRef.current.lastY = event.clientY
    }

    const handleYAxisDoubleClick = () => {
        runtimeRef.current.isAutoScaled = true
        drawCanvas()
    }

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

    const toggleDrawMode = () => {
        const next = !drawModeRef.current
        drawModeRef.current = next
        setDrawMode(next)
        if (!next) setDrawMenu(null)
        if (chartCanvasRef.current) chartCanvasRef.current.style.cursor = 'crosshair'
        drawCanvas()
    }

    const removeDrawing = (id: number) => {
        const nextDrawings = runtimeRef.current.drawings.filter((item) => item.id !== id)
        runtimeRef.current.drawings = nextDrawings
        setDrawings(nextDrawings)
    }

    const createDrawing = (type: ToolType) => {
        const runtime = runtimeRef.current
        const data = runtime.chartData[currentTfRef.current]
        const index = runtime.selectedCandleIndex
        if (index === null || !data[index]) {
            setDrawMenu(null)
            drawMenuOpenRef.current = false
            return
        }

        const candle = data[index]
        let newDrawing: DrawingDraft | null = null

        if (type === 'FVG') {
            if (index > 0 && index < data.length - 1) {
                const prev = data[index - 1]
                const next = data[index + 1]
                if (prev.high < next.low) {
                    newDrawing = { type: 'FVG', time: candle.time, top: next.low, bot: prev.high, color: 'rgba(34, 197, 94, 0.25)', border: 'rgba(34, 197, 94, 0.8)' }
                } else if (prev.low > next.high) {
                    newDrawing = { type: 'FVG', time: candle.time, top: prev.low, bot: next.high, color: 'rgba(239, 68, 68, 0.25)', border: 'rgba(239, 68, 68, 0.8)' }
                } else {
                    window.alert('No FVG detected on this candle. (No gap between i-1 and i+1)')
                }
            } else {
                window.alert('Cannot calculate FVG on boundary candles.')
            }
        } else if (type === 'OB') {
            newDrawing = { type: 'OB', time: candle.time, price: candle.open, color: '#3b82f6' }
        } else if (type === 'EQH' || type === 'SH') {
            newDrawing = { type, time: candle.time, price: candle.high, color: '#ef4444' }
        } else if (type === 'EQL' || type === 'SL') {
            newDrawing = { type, time: candle.time, price: candle.low, color: '#22c55e' }
        }

        if (newDrawing) {
            const nextDrawings = [...runtime.drawings, { ...newDrawing, id: runtime.drawingIdCounter }] as Drawing[]
            runtime.drawingIdCounter += 1
            runtime.drawings = nextDrawings
            setDrawings(nextDrawings)
        }

        runtime.selectedCandleIndex = null
        drawMenuOpenRef.current = false
        setDrawMenu(null)
    }

    const loadCsvFiles = createLoadCsvFiles({ runtimeRef, currentTfRef, drawCanvas })

    return {
        changeTimeframe,
        jumpToDate,
        toggleDrawMode,
        loadCsvFiles,
        removeDrawing,
        createDrawing,
        handleChartMouseDown,
        handleChartWheel,
        handleChartMouseLeave,
        handleYAxisMouseDown,
        handleYAxisDoubleClick,
    }
}
