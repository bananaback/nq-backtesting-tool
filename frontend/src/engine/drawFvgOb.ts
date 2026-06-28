import type { FvgDrawing } from '../types/drawings/fvg'
import type { ObDrawing } from '../types/drawings/ob'
import type { OrgDrawing } from '../types/drawings/org'
import { getDrawingLengthMinutes } from '../utils/drawing'

export function drawFvg(
    ctx: CanvasRenderingContext2D,
    chartCanvas: HTMLCanvasElement,
    candleSpace: number,
    timeframeMinutes: number,
    getY: (price: number) => number,
    tool: FvgDrawing,
    x: number,
    isSelected: boolean,
) {
    const yTop = getY(tool.top)
    const yBot = getY(tool.bot)
    const height = Math.abs(yBot - yTop)
    const yDraw = Math.min(yTop, yBot)
    const lengthMinutes = getDrawingLengthMinutes(tool.lengthMinutes)
    const rectWidth = lengthMinutes === null ? chartCanvas.width - x : Math.max(1, (lengthMinutes / timeframeMinutes) * candleSpace)

    ctx.fillStyle = tool.color
    ctx.fillRect(x, yDraw, rectWidth, height)
    ctx.strokeStyle = tool.border
    ctx.lineWidth = isSelected ? 2 : 1
    ctx.strokeRect(x, yDraw, rectWidth, height)
    if (isSelected) {
        ctx.save()
        ctx.strokeStyle = '#6d28d9'
        ctx.lineWidth = 1
        ctx.setLineDash([6, 3])
        ctx.strokeRect(x - 2, yDraw - 2, rectWidth + 4, height + 4)
        ctx.restore()
    }
}

export function drawOrg(
    ctx: CanvasRenderingContext2D,
    chartCanvas: HTMLCanvasElement,
    candleSpace: number,
    timeframeMinutes: number,
    getY: (price: number) => number,
    tool: OrgDrawing,
    x: number,
    isSelected: boolean,
) {
    const yTop = getY(tool.top)
    const yBot = getY(tool.bot)
    const height = Math.abs(yBot - yTop)
    const yDraw = Math.min(yTop, yBot)
    const isPremium = tool.price0930 > tool.price1614
    const fillColor = tool.type === 'ORG'
        ? (isPremium ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)')
        : (tool.fillColor ?? 'rgba(59, 130, 246, 0.14)')
    const borderColor = tool.type === 'ORG'
        ? (isPremium ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)')
        : (tool.borderColor ?? 'rgba(59, 130, 246, 0.65)')

    ctx.save()
    ctx.fillStyle = fillColor
    ctx.strokeStyle = borderColor

    const lengthMinutes = getDrawingLengthMinutes(tool.lengthMinutes)
    const rectWidth = lengthMinutes === null ? chartCanvas.width - x : Math.max(1, (lengthMinutes / timeframeMinutes) * candleSpace)

    ctx.setLineDash([2, 2])
    ctx.fillRect(x, yDraw, rectWidth, height)
    ctx.strokeRect(x, yDraw, rectWidth, height)
    if (isSelected) {
        ctx.save()
        ctx.strokeStyle = '#6d28d9'
        ctx.lineWidth = 1
        ctx.setLineDash([6, 3])
        ctx.strokeRect(x - 2, yDraw - 2, rectWidth + 4, height + 4)
        ctx.restore()
    }

    ctx.setLineDash([4, 4])
    ctx.lineWidth = 0.5
    const levels = [0.25, 0.5, 0.75]
    levels.forEach(lvl => {
        const yLvl = getY(tool.price1614 + (tool.price0930 - tool.price1614) * lvl)
        ctx.beginPath()
        ctx.moveTo(x, yLvl)
        ctx.lineTo(chartCanvas.width, yLvl)
        ctx.stroke()

        ctx.fillStyle = isPremium ? '#15803d' : '#b91c1c'
        ctx.font = '8px sans-serif'
        ctx.fillText(lvl.toString(), chartCanvas.width - 25, yLvl - 2)
    })

    ctx.fillStyle = tool.type === 'ORG' ? (isPremium ? '#15803d' : '#b91c1c') : (tool.borderColor ?? '#2563eb')
    ctx.font = 'bold 10px sans-serif'
    const label = tool.type === 'ORG' ? `${tool.type} (${isPremium ? 'Premium' : 'Discount'})` : tool.type
    ctx.fillText(label, x + 8, yDraw + 14)
    ctx.restore()
}

export function drawOb(
    ctx: CanvasRenderingContext2D,
    candleSpace: number,
    timeframeMinutes: number,
    getY: (price: number) => number,
    tool: ObDrawing,
    x: number,
    isSelected: boolean,
) {
    const yTop = getY(tool.top)
    const yBot = getY(tool.bot)
    const height = Math.abs(yBot - yTop)
    const yDraw = Math.min(yTop, yBot)
    const rectWidth = Math.max(1, (tool.lengthMinutes / timeframeMinutes) * candleSpace)

    ctx.fillStyle = tool.color
    ctx.fillRect(x, yDraw, rectWidth, height)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1
    ctx.strokeRect(x, yDraw, rectWidth, height)
    if (isSelected) {
        ctx.save()
        ctx.strokeStyle = '#6d28d9'
        ctx.lineWidth = 1
        ctx.setLineDash([6, 3])
        ctx.strokeRect(x - 2, yDraw - 2, rectWidth + 4, height + 4)
        ctx.restore()
    }
}
