import type { EntryStatus } from '../types/chart'

const SPLIT_COLORS = {
    realizedProfitFill: 'rgba(22, 163, 74, 0.22)',
    realizedProfitStroke: 'rgba(22, 163, 74, 0.45)',
    unrealizedProfitFill: 'rgba(34, 197, 94, 0.08)',
    unrealizedProfitStroke: 'rgba(34, 197, 94, 0.20)',
    potentialProfitFill: 'rgba(34, 197, 94, 0.10)',
    potentialProfitStroke: 'rgba(34, 197, 94, 0.22)',
    realizedLossFill: 'rgba(220, 38, 38, 0.22)',
    realizedLossStroke: 'rgba(220, 38, 38, 0.45)',
    unrealizedLossFill: 'rgba(239, 68, 68, 0.08)',
    unrealizedLossStroke: 'rgba(239, 68, 68, 0.20)',
    atRiskLossFill: 'rgba(239, 68, 68, 0.10)',
    atRiskLossStroke: 'rgba(239, 68, 68, 0.22)',
    neutralProfitFill: 'rgba(34, 197, 94, 0.10)',
    neutralProfitStroke: 'rgba(34, 197, 94, 0.22)',
    neutralLossFill: 'rgba(239, 68, 68, 0.10)',
    neutralLossStroke: 'rgba(239, 68, 68, 0.22)',
}

const STATUS_COLORS: Record<EntryStatus, {
    profitFill: string
    profitStroke: string
    lossFill: string
    lossStroke: string
}> = {
    IN_PROGRESS: {
        profitFill: 'rgba(156, 163, 175, 0.12)',
        profitStroke: 'rgba(156, 163, 175, 0.25)',
        lossFill: 'rgba(156, 163, 175, 0.08)',
        lossStroke: 'rgba(156, 163, 175, 0.18)',
    },
    TP_HIT: {
        profitFill: 'rgba(34, 197, 94, 0.35)',
        profitStroke: 'rgba(22, 163, 74, 0.7)',
        lossFill: 'rgba(239, 68, 68, 0.05)',
        lossStroke: 'rgba(239, 68, 68, 0.1)',
    },
    SL_HIT: {
        profitFill: 'rgba(34, 197, 94, 0.05)',
        profitStroke: 'rgba(34, 197, 94, 0.1)',
        lossFill: 'rgba(220, 38, 38, 0.35)',
        lossStroke: 'rgba(185, 28, 28, 0.7)',
    },
}

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

const TAB_COLORS: Record<EntryStatus, { entry: string; sl: string; tp: string }> = {
    IN_PROGRESS: { entry: '#6b7280', sl: '#9ca3af', tp: '#9ca3af' },
    TP_HIT: { entry: '#22c55e', sl: '#ef4444', tp: '#16a34a' },
    SL_HIT: { entry: '#dc2626', sl: '#b91c1c', tp: '#86efac' },
}

export function drawEntryAxisTabs(
    yCtx: CanvasRenderingContext2D,
    yAxisCanvas: HTMLCanvasElement,
    entryY: number,
    slY: number,
    tpY: number,
    entryPrice: number,
    slPrice: number,
    tpPrice: number,
    isLong: boolean,
    isSelected: boolean,
    status: EntryStatus,
): void {
    const tabColors = TAB_COLORS[status]
    void isLong

    const tabs = [
        { y: entryY, price: entryPrice, color: tabColors.entry, label: 'E' },
        { y: slY, price: slPrice, color: tabColors.sl, label: 'SL' },
        { y: tpY, price: tpPrice, color: tabColors.tp, label: 'TP' },
    ]

    yCtx.save()
    yCtx.textBaseline = 'middle'

    tabs.forEach((tab) => {
        const tabY = Math.max(9, Math.min(yAxisCanvas.height - 9, tab.y))
        const tabWidth = 60
        const tabHeight = 18
        const radius = 4
        const tabX = 0

        // Rounded rectangle
        yCtx.fillStyle = tab.color
        yCtx.beginPath()
        yCtx.moveTo(tabX + radius, tabY - tabHeight / 2)
        yCtx.lineTo(tabX + tabWidth - radius, tabY - tabHeight / 2)
        yCtx.quadraticCurveTo(tabX + tabWidth, tabY - tabHeight / 2, tabX + tabWidth, tabY - tabHeight / 2 + radius)
        yCtx.lineTo(tabX + tabWidth, tabY + tabHeight / 2 - radius)
        yCtx.quadraticCurveTo(tabX + tabWidth, tabY + tabHeight / 2, tabX + tabWidth - radius, tabY + tabHeight / 2)
        yCtx.lineTo(tabX + radius, tabY + tabHeight / 2)
        yCtx.quadraticCurveTo(tabX, tabY + tabHeight / 2, tabX, tabY + tabHeight / 2 - radius)
        yCtx.lineTo(tabX, tabY - tabHeight / 2 + radius)
        yCtx.quadraticCurveTo(tabX, tabY - tabHeight / 2, tabX + radius, tabY - tabHeight / 2)
        yCtx.closePath()
        yCtx.fill()

        // Selected border
        if (isSelected) {
            yCtx.strokeStyle = '#6d28d9'
            yCtx.lineWidth = 2
            yCtx.setLineDash([])
            yCtx.stroke()
        }

        // White label text
        yCtx.fillStyle = '#ffffff'
        yCtx.font = 'bold 9px sans-serif'
        yCtx.fillText(`${tab.label} ${tab.price.toFixed(2)}`, tabX + 4, tabY)
    })

    yCtx.restore()
}
