import type { Candle } from '../types/chart'
import type { ChartRuntimeState } from '../types/state'
import { getFibLevelPrice, getDrawingLengthMinutes } from '../utils/drawing'
import { getIndexByTime } from '../utils/time'

export function hitTestDrawings(
    runtime: ChartRuntimeState,
    canvas: HTMLCanvasElement,
    cursorX: number,
    cursorY: number,
    candleSpace: number,
    getY: (price: number) => number,
    currentTfMinutes: number,
    data: Candle[],
): number | null {
    let bestId: number | null = null

    for (let i = runtime.drawings.length - 1; i >= 0; i -= 1) {
        const tool = runtime.drawings[i]
        const idx = getIndexByTime(data, tool.time)
        if (idx === -1) continue
        const x = (idx - runtime.viewStart) * candleSpace + candleSpace / 2

        if (tool.type === 'VLINE') {
            const dx = Math.abs(cursorX - x)
            if (dx <= 12) {
                bestId = tool.id
                break
            }
            continue
        }

        if (tool.type === 'FIB') {
            const index1 = getIndexByTime(data, tool.time)
            const index2 = getIndexByTime(data, tool.time2)
            if (index1 === -1 || index2 === -1) continue

            const x1 = (index1 - runtime.viewStart) * candleSpace + candleSpace / 2
            const x2 = (index2 - runtime.viewStart) * candleSpace + candleSpace / 2
            const y1 = getY(tool.price1)
            const y2 = getY(tool.price2)
            const leftX = Math.min(x1, x2)
            const rightX = Math.max(x1, x2)
            const segX = x2 - x1
            const segY = y2 - y1
            const segLengthSq = segX * segX + segY * segY || 1
            const rawT = ((cursorX - x1) * segX + (cursorY - y1) * segY) / segLengthSq
            const t = Math.max(0, Math.min(1, rawT))
            const projX = x1 + segX * t
            const projY = y1 + segY * t

            if (Math.hypot(cursorX - projX, cursorY - projY) <= 12) {
                bestId = tool.id
                break
            }

            for (const level of tool.levels) {
                if (!level.visible) continue
                const y = getY(getFibLevelPrice(tool, level.ratio))
                const levelRightX = tool.extendRight ? canvas.width : rightX
                const onSegment = cursorX >= leftX && cursorX <= levelRightX
                const dyLevel = Math.abs(cursorY - y)
                if (onSegment && dyLevel <= 10) {
                    bestId = tool.id
                    break
                }
            }
            if (bestId !== null) break
            continue
        }

        if (tool.type === 'ENTRY') {
            const entryY = getY(tool.entryPrice)
            const slY = getY(tool.stopLossPrice)
            const tpY = getY(tool.takeProfitPrice)
            const effectiveWidthInCandles = tool.lengthMinutes
                ? Math.max(1, Math.round(tool.lengthMinutes / currentTfMinutes))
                : tool.widthInCandles
            const widthEndX = (idx + effectiveWidthInCandles - runtime.viewStart) * candleSpace + candleSpace / 2
            const rightX = Math.min(widthEndX, canvas.width)
            const dyEntry = Math.abs(cursorY - entryY)
            const dySL = Math.abs(cursorY - slY)
            const dyTP = Math.abs(cursorY - tpY)
            if ((dyEntry <= 10 || dySL <= 10 || dyTP <= 10) && cursorX >= x - 5 && cursorX <= rightX) {
                bestId = tool.id
                break
            }
            continue
        }

        if (tool.type === 'FVG' || tool.type === 'ORG' || tool.type === 'NDOG' || tool.type === 'NWOG') {
            const top = tool.top
            const bot = tool.bot
            const yTop = getY(top)
            const yBot = getY(bot)
            const yDraw = Math.min(yTop, yBot)
            const height = Math.abs(yBot - yTop)
            const lengthMinutes = getDrawingLengthMinutes(tool.lengthMinutes)
            const rectWidth = lengthMinutes === null ? canvas.width - x : Math.max(1, (lengthMinutes / currentTfMinutes) * candleSpace)
            const rightX = x + rectWidth

            if (cursorX >= x && cursorX <= rightX && cursorY >= yDraw && cursorY <= yDraw + height) {
                bestId = tool.id
                break
            }
            const dy = cursorY < yDraw ? yDraw - cursorY : cursorY > yDraw + height ? cursorY - (yDraw + height) : 0
            const dx = cursorX < x ? x - cursorX : cursorX > rightX ? cursorX - rightX : 0
            const dist = Math.hypot(dx, dy)
            if (dist <= 18) {
                bestId = tool.id
                break
            }
            continue
        }

        if ('price' in tool) {
            const y = getY(tool.price)
            const lengthMinutes = getDrawingLengthMinutes(tool.lengthMinutes)
            const rectWidth = lengthMinutes === null ? canvas.width - x : Math.max(1, (lengthMinutes / currentTfMinutes) * candleSpace)
            const rightX = x + rectWidth
            const dy = Math.abs(cursorY - y)
            if (dy <= 12 && cursorX >= x && cursorX <= rightX) {
                bestId = tool.id
                break
            }
        }
    }

    return bestId
}
