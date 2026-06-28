import type { EntryStatus } from '../types/drawings/entry'
import { SPLIT_COLORS, STATUS_COLORS } from './entryConstants'

export function drawEntryZones(
    ctx: CanvasRenderingContext2D,
    entryX: number,
    entryY: number,
    slY: number,
    tpY: number,
    chartRightX: number,
    isLong: boolean,
    isSelected: boolean,
    status: EntryStatus,
    currentY: number | null,
): void {
    // isLong used implicitly: zone logic uses Math.min/Math.max which handles both directions
    void isLong
    ctx.save()

    // Helper to draw a single zone rect
    const drawRect = (y: number, height: number, fill: string, stroke: string) => {
        if (height <= 1) return
        ctx.fillStyle = fill
        ctx.fillRect(entryX, y, chartRightX - entryX, height)
        ctx.strokeStyle = stroke
        ctx.lineWidth = 1
        ctx.setLineDash([])
        ctx.strokeRect(entryX, y, chartRightX - entryX, height)
    }

    // Profit zone: between entryY and tpY
    const profitTop = Math.min(entryY, tpY)
    const profitBottom = Math.max(entryY, tpY)
    const profitHeight = profitBottom - profitTop

    // Loss zone: between entryY and slY
    const lossTop = Math.min(entryY, slY)
    const lossBottom = Math.max(entryY, slY)
    const lossHeight = lossBottom - lossTop

    if (currentY !== null && status === 'IN_PROGRESS') {
        const inProfitZone = currentY > profitTop && currentY < profitBottom
        const inLossZone = currentY > lossTop && currentY < lossBottom

        if (inProfitZone) {
            const rpTop = Math.min(entryY, currentY)
            const rpHeight = Math.abs(entryY - currentY)
            drawRect(rpTop, rpHeight, SPLIT_COLORS.realizedProfitFill, SPLIT_COLORS.realizedProfitStroke)

            const upTop = Math.min(currentY, tpY)
            const upHeight = Math.abs(currentY - tpY)
            drawRect(upTop, upHeight, SPLIT_COLORS.unrealizedProfitFill, SPLIT_COLORS.unrealizedProfitStroke)

            if (lossHeight > 1) {
                drawRect(lossTop, lossHeight, SPLIT_COLORS.atRiskLossFill, SPLIT_COLORS.atRiskLossStroke)
            }
        } else if (inLossZone) {
            if (profitHeight > 1) {
                drawRect(profitTop, profitHeight, SPLIT_COLORS.potentialProfitFill, SPLIT_COLORS.potentialProfitStroke)
            }

            const rlTop = Math.min(entryY, currentY)
            const rlHeight = Math.abs(entryY - currentY)
            drawRect(rlTop, rlHeight, SPLIT_COLORS.realizedLossFill, SPLIT_COLORS.realizedLossStroke)

            const ulTop = Math.min(currentY, slY)
            const ulHeight = Math.abs(currentY - slY)
            drawRect(ulTop, ulHeight, SPLIT_COLORS.unrealizedLossFill, SPLIT_COLORS.unrealizedLossStroke)
        } else {
            if (profitHeight > 1) {
                drawRect(profitTop, profitHeight, SPLIT_COLORS.neutralProfitFill, SPLIT_COLORS.neutralProfitStroke)
            }
            if (lossHeight > 1) {
                drawRect(lossTop, lossHeight, SPLIT_COLORS.neutralLossFill, SPLIT_COLORS.neutralLossStroke)
            }
        }
    } else {
        const colors = STATUS_COLORS[status]
        if (profitHeight > 1) {
            drawRect(profitTop, profitHeight, colors.profitFill, colors.profitStroke)
        }
        if (lossHeight > 1) {
            drawRect(lossTop, lossHeight, colors.lossFill, colors.lossStroke)
        }
    }

    // Selected: purple dashed outline around combined zone
    if (isSelected) {
        const combinedTop = Math.min(profitTop, lossTop)
        const combinedBottom = Math.max(profitBottom, lossBottom)
        const combinedHeight = combinedBottom - combinedTop
        if (combinedHeight > 1) {
            ctx.strokeStyle = '#6d28d9'
            ctx.lineWidth = 1
            ctx.setLineDash([6, 3])
            ctx.strokeRect(entryX - 2, combinedTop - 2, chartRightX - entryX + 4, combinedHeight + 4)
        }
    }

    ctx.restore()
}
