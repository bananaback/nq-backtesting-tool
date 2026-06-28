import type { Candle } from '../types/chart'
import type { ChartRuntimeState } from '../types/state'

export function computeCandleFilter(
    runtime: ChartRuntimeState,
    data: Candle[],
): { candleFilterLastIndex: number; shouldRenderCandle: (time: string) => boolean } {
    const filterCutoffEpoch = runtime.candleFilterMinute ? new Date(runtime.candleFilterMinute).getTime() : Number.NaN
    let candleFilterLastIndex = data.length - 1
    if (runtime.candleFilterMinute && !runtime.renderAfterFilterMinute) {
        const normalized = runtime.candleFilterMinute.includes(' ')
            ? runtime.candleFilterMinute.replace(' ', 'T')
            : runtime.candleFilterMinute
        const cutoffEpochMs = new Date(normalized).getTime()
        let lo = 0
        let hi = data.length - 1
        while (lo <= hi) {
            const mid = (lo + hi) >>> 1
            const t = data[mid].time
            const norm = t.includes(' ') ? t.replace(' ', 'T') : t
            const epoch = new Date(norm).getTime()
            if (epoch <= cutoffEpochMs) {
                candleFilterLastIndex = mid
                lo = mid + 1
            } else {
                hi = mid - 1
            }
        }
    }

    const shouldRenderCandle = (time: string) => {
        if (!Number.isFinite(filterCutoffEpoch)) return true
        const normalized = time.includes(' ') ? time.replace(' ', 'T') : time
        const candleEpoch = new Date(normalized).getTime()
        if (!Number.isFinite(candleEpoch)) return true
        if (candleEpoch <= filterCutoffEpoch) return true
        return runtime.renderAfterFilterMinute
    }

    return { candleFilterLastIndex, shouldRenderCandle }
}

export function drawCandles(
    ctx: CanvasRenderingContext2D,
    xCtx: CanvasRenderingContext2D,
    xAxisCanvas: HTMLCanvasElement,
    runtime: ChartRuntimeState,
    data: Candle[],
    candleSpace: number,
    candleWidth: number,
    startIdx: number,
    endIdx: number,
    getY: (price: number) => number,
    shouldRenderCandle: (time: string) => boolean,
) {
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1
    xCtx.fillStyle = '#6b7280'
    xCtx.font = '11px sans-serif'
    xCtx.textAlign = 'center'
    xCtx.textBaseline = 'middle'

    let lastDrawnTimeX = -100
    for (let i = startIdx; i <= endIdx; i += 1) {
        const candle = data[i]
        if (!shouldRenderCandle(candle.time)) continue
        const x = (i - runtime.viewStart) * candleSpace + candleSpace / 2
        const xLine = Math.floor(x) + 0.5

        if (x - lastDrawnTimeX > 100) {
            xCtx.fillText(candle.time.length >= 16 ? candle.time.substring(5, 16) : candle.time, xLine, xAxisCanvas.height / 2)
            lastDrawnTimeX = xLine
        }

        const yO = getY(candle.open)
        const yC = getY(candle.close)
        const yH = getY(candle.high)
        const yL = getY(candle.low)

        ctx.beginPath()
        ctx.moveTo(xLine, Math.floor(yH) + 0.5)
        ctx.lineTo(xLine, Math.floor(yL) + 0.5)
        ctx.strokeStyle = '#000000'
        ctx.stroke()

        const bullish = candle.close > candle.open
        ctx.fillStyle = bullish ? '#22c55e' : '#000000'
        const top = Math.floor(Math.min(yO, yC)) + 0.5
        const bottom = Math.floor(Math.max(yO, yC)) + 0.5
        const height = Math.max(1, bottom - top)
        const width = Math.floor(candleWidth)
        const xBody = Math.floor(x - width / 2) + 0.5
        ctx.fillRect(xBody, top, width, height)
        ctx.strokeRect(xBody, top, width, height)
    }
}
