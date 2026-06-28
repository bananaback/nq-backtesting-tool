import type { EntryStatus } from '../types/drawings/entry'
import { TAB_COLORS } from './entryConstants'

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
