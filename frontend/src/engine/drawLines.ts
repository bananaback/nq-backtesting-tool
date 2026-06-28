import type { Candle } from '../types/chart'
import type { ChartRuntimeState } from '../types/state'
import type { LineDrawing } from '../types/drawings/line'
import { getIndexByTime } from '../utils/time'
import { getDrawingLengthMinutes } from '../utils/drawing'

export function drawLineTool(
    ctx: CanvasRenderingContext2D,
    chartCanvas: HTMLCanvasElement,
    runtime: ChartRuntimeState,
    data: Candle[],
    candleSpace: number,
    timeframeMinutes: number,
    endIdx: number,
    getY: (price: number) => number,
    tool: LineDrawing,
    x: number,
    index: number,
    isSelected: boolean,
) {
    const y = getY(tool.price)
    const lengthMinutes = getDrawingLengthMinutes(tool.lengthMinutes)
    let endX: number
    if (lengthMinutes !== null) {
        const rectWidth = Math.max(1, (lengthMinutes / timeframeMinutes) * candleSpace)
        endX = x + rectWidth
    } else {
        let scanStartIdx = index + 1
        let scanEndIdx = endIdx

        if (tool.breakScanStart) {
            const bsi = getIndexByTime(data, tool.breakScanStart)
            if (bsi !== -1) scanStartIdx = bsi + 1
        }
        if (tool.endTime) {
            const eti = getIndexByTime(data, tool.endTime)
            if (eti !== -1) scanEndIdx = eti
        }

        let crossCandleIdx = -1
        for (let i = scanStartIdx; i <= scanEndIdx; i++) {
            if (data[i].low <= tool.price && tool.price <= data[i].high) {
                crossCandleIdx = i
                break
            }
        }
        if (crossCandleIdx !== -1) {
            endX = (crossCandleIdx - runtime.viewStart) * candleSpace + candleSpace / 2
        } else {
            endX = (scanEndIdx - runtime.viewStart) * candleSpace + candleSpace / 2
        }
    }
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(endX, y)
    ctx.strokeStyle = isSelected ? '#6d28d9' : tool.color
    ctx.lineWidth = isSelected ? 3 : 1
    ctx.stroke()

    // Draw labels
    if (tool.type === 'OPEN_0000' || tool.type === 'OPEN_0830' || tool.type === 'OPEN_0930') {
        const label = tool.type === 'OPEN_0000' ? '0:00 Open' : tool.type === 'OPEN_0830' ? '8:30 Open' : '9:30 Open'
        ctx.save()
        ctx.fillStyle = tool.color
        ctx.font = 'bold 10px sans-serif'
        const labelX = Math.max(4, x + 4)
        ctx.fillText(label, labelX, y - 4)
        ctx.restore()
    }
    if (tool.type === 'ASIAN_HIGH') {
        ctx.save(); ctx.fillStyle = tool.color; ctx.font = 'bold 10px sans-serif'
        ctx.fillText('Asian H', Math.max(4, x + 4), y - 4); ctx.restore()
    }
    if (tool.type === 'ASIAN_LOW') {
        ctx.save(); ctx.fillStyle = tool.color; ctx.font = 'bold 10px sans-serif'
        ctx.fillText('Asian L', Math.max(4, x + 4), y - 4); ctx.restore()
    }
    if (tool.type === 'LONDON_HIGH') {
        ctx.save(); ctx.fillStyle = tool.color; ctx.font = 'bold 10px sans-serif'
        ctx.fillText('London H', Math.max(4, x + 4), y - 4); ctx.restore()
    }
    if (tool.type === 'LONDON_LOW') {
        ctx.save(); ctx.fillStyle = tool.color; ctx.font = 'bold 10px sans-serif'
        ctx.fillText('London L', Math.max(4, x + 4), y - 4); ctx.restore()
    }
    if (tool.type === 'PREV_DAY_PM_HIGH') {
        ctx.save(); ctx.fillStyle = tool.color; ctx.font = 'bold 10px sans-serif'
        ctx.fillText('Prev PM H', Math.max(4, x + 4), y - 4); ctx.restore()
    }
    if (tool.type === 'PREV_DAY_PM_LOW') {
        ctx.save(); ctx.fillStyle = tool.color; ctx.font = 'bold 10px sans-serif'
        ctx.fillText('Prev PM L', Math.max(4, x + 4), y - 4); ctx.restore()
    }
    if (tool.type === 'PREV_DAY_AM_HIGH') {
        ctx.save(); ctx.fillStyle = tool.color; ctx.font = 'bold 10px sans-serif'
        ctx.fillText('Prev AM H', Math.max(4, x + 4), y - 4); ctx.restore()
    }
    if (tool.type === 'PREV_DAY_AM_LOW') {
        ctx.save(); ctx.fillStyle = tool.color; ctx.font = 'bold 10px sans-serif'
        ctx.fillText('Prev AM L', Math.max(4, x + 4), y - 4); ctx.restore()
    }
    if (tool.type === 'PRE_HIGH') {
        ctx.save(); ctx.fillStyle = tool.color; ctx.font = 'bold 10px sans-serif'
        ctx.fillText('Pre H', Math.max(4, x + 4), y - 4); ctx.restore()
    }
    if (tool.type === 'PRE_LOW') {
        ctx.save(); ctx.fillStyle = tool.color; ctx.font = 'bold 10px sans-serif'
        ctx.fillText('Pre L', Math.max(4, x + 4), y - 4); ctx.restore()
    }
}
