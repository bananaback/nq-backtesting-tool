import type { Candle } from '../types/chart'
import type { ChartRuntimeState } from '../types/state'
import { isMidnightCandle } from '../utils/time'

export function drawDaySeparators(
    ctx: CanvasRenderingContext2D,
    xCtx: CanvasRenderingContext2D,
    chartCanvas: HTMLCanvasElement,
    xAxisCanvas: HTMLCanvasElement,
    runtime: ChartRuntimeState,
    data: Candle[],
    candleSpace: number,
    startIdx: number,
    endIdx: number,
) {
    for (let i = Math.max(startIdx, 1); i <= endIdx; i += 1) {
        if (!isMidnightCandle(data[i].time)) continue

        const x = (i - runtime.viewStart) * candleSpace + candleSpace / 2
        const xLine = Math.floor(x) + 0.5

        ctx.save()
        ctx.setLineDash([2, 4])
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(xLine, 0)
        ctx.lineTo(xLine, chartCanvas.height)
        ctx.stroke()
        ctx.restore()

        xCtx.save()
        xCtx.setLineDash([2, 4])
        xCtx.strokeStyle = 'rgba(0, 0, 0, 0.22)'
        xCtx.lineWidth = 1
        xCtx.beginPath()
        xCtx.moveTo(xLine, 0)
        xCtx.lineTo(xLine, xAxisCanvas.height)
        xCtx.stroke()
        xCtx.restore()
    }
}
