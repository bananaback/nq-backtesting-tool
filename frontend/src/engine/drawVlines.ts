import type { ChartRuntimeState } from '../types/state'

export function drawVline(
    ctx: CanvasRenderingContext2D,
    chartCanvas: HTMLCanvasElement,
    runtime: ChartRuntimeState,
    x: number,
    color: string,
    isSelected: boolean,
) {
    ctx.save()
    ctx.strokeStyle = color || 'rgba(0, 0, 0, 0.22)'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 4])
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, chartCanvas.height)
    ctx.stroke()
    ctx.restore()
    if (isSelected) {
        ctx.save()
        ctx.strokeStyle = '#6d28d9'
        ctx.lineWidth = 1
        ctx.setLineDash([6, 3])
        ctx.beginPath()
        ctx.moveTo(x - 2, 0)
        ctx.lineTo(x - 2, chartCanvas.height)
        ctx.stroke()
        ctx.restore()
    }
}
