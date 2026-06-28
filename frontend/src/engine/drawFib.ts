import type { ChartRuntimeState, Timeframe } from '../types/chart'
import { getIndexByTime } from '../utils/time'
import { getFibLevelPrice, getFibLineDash } from '../utils/drawing'

export type FibRenderLevel = {
    ratio: number
    label: string
    color: string
    visible: boolean
}

export type FibRenderDrawing = {
    time: string
    time2: string
    price1: number
    price2: number
    extendRight: boolean
    reverse: boolean
    lineStyle: 'normal' | 'dashed' | 'dotted'
    lineWidth: number
    levels: FibRenderLevel[]
}

export function drawFibDrawing(
    ctx: CanvasRenderingContext2D,
    chartCanvas: HTMLCanvasElement,
    runtime: ChartRuntimeState,
    data: ChartRuntimeState['chartData'][Timeframe],
    candleSpace: number,
    getY: (price: number) => number,
    fibTool: FibRenderDrawing,
    isSelected: boolean,
) {
    const index1 = getIndexByTime(data, fibTool.time)
    const index2 = getIndexByTime(data, fibTool.time2)
    if (index1 === -1 || index2 === -1) return

    const x1 = (index1 - runtime.viewStart) * candleSpace + candleSpace / 2
    const x2 = (index2 - runtime.viewStart) * candleSpace + candleSpace / 2
    const y1 = getY(fibTool.price1)
    const y2 = getY(fibTool.price2)
    const leftX = Math.min(x1, x2)
    const rightX = Math.max(x1, x2)
    const drawRightX = fibTool.extendRight ? chartCanvas.width : rightX
    const levels = fibTool.levels.filter((level) => level.visible)
    const dash = getFibLineDash(fibTool.lineStyle)
    const baseLineWidth = Number.isFinite(fibTool.lineWidth) ? Math.max(0.5, fibTool.lineWidth) : 1.5

    ctx.save()
    ctx.strokeStyle = '#000000'
    ctx.setLineDash(dash)
    ctx.lineWidth = isSelected ? baseLineWidth + 0.8 : baseLineWidth

    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.arc(x1, y1, 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x2, y2, 2.5, 0, Math.PI * 2)
    ctx.fill()

    levels.forEach((level) => {
        const y = getY(getFibLevelPrice(fibTool, level.ratio))
        ctx.strokeStyle = level.color || '#000000'
        ctx.setLineDash(dash)
        ctx.lineWidth = baseLineWidth
        ctx.beginPath()
        ctx.moveTo(leftX, y)
        ctx.lineTo(drawRightX, y)
        ctx.stroke()

        ctx.fillStyle = level.color || '#000000'
        ctx.font = 'bold 10px sans-serif'
        ctx.fillText(level.label, drawRightX - 44, y - 4)
    })

    if (isSelected) {
        ctx.save()
        ctx.strokeStyle = '#6d28d9'
        ctx.setLineDash([6, 3])
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x1 - 2, y1 - 2)
        ctx.lineTo(x2 + 2, y2 + 2)
        ctx.stroke()
        ctx.restore()
    }

    ctx.restore()
}
