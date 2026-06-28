type ResizeTradingChartArgs = {
    chartCanvas: HTMLCanvasElement
    yAxisCanvas: HTMLCanvasElement
    xAxisCanvas: HTMLCanvasElement
    chartStage: HTMLDivElement
    drawChart: () => void
}

export function resizeTradingChart({
    chartCanvas,
    yAxisCanvas,
    xAxisCanvas,
    chartStage,
    drawChart,
}: ResizeTradingChartArgs) {
    const chartRow = chartCanvas.parentElement
    if (!chartRow) return

    chartCanvas.width = Math.max(0, chartRow.clientWidth - 80)
    chartCanvas.height = chartRow.clientHeight
    yAxisCanvas.width = 80
    yAxisCanvas.height = chartRow.clientHeight
    xAxisCanvas.width = Math.max(0, chartStage.clientWidth - 80)
    xAxisCanvas.height = 24
    drawChart()
}
