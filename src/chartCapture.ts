/**
 * Captures three canvases (chart, y-axis, x-axis) into a single PNG image
 * and triggers a browser download.
 *
 * Combines the three canvases onto an offscreen canvas arranged as:
 * chart at top-left, y-axis at top-right, x-axis at bottom-left.
 * The download filename includes the current timestamp.
 *
 * All errors are silently ignored — capture is best-effort and never throws.
 *
 * @param chartCanvas - The main chart canvas with rendered candle content.
 * @param yAxisCanvas - The y-axis canvas with rendered price labels.
 * @param xAxisCanvas - The x-axis canvas with rendered time labels.
 */
export function captureChartToImage(
  chartCanvas: HTMLCanvasElement,
  yAxisCanvas: HTMLCanvasElement,
  xAxisCanvas: HTMLCanvasElement
): void {
  try {
    const width = chartCanvas.width + yAxisCanvas.width
    const height = chartCanvas.height + xAxisCanvas.height

    const offscreenCanvas = document.createElement('canvas')
    offscreenCanvas.width = width
    offscreenCanvas.height = height

    const ctx = offscreenCanvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(chartCanvas, 0, 0)
    ctx.drawImage(yAxisCanvas, chartCanvas.width, 0)
    ctx.drawImage(xAxisCanvas, 0, chartCanvas.height)

    offscreenCanvas.toBlob((blob: Blob | null) => {
      if (!blob) return

      const now = new Date()
      const yyyy = now.getFullYear()
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      const hh = String(now.getHours()).padStart(2, '0')
      const min = String(now.getMinutes()).padStart(2, '0')
      const ss = String(now.getSeconds()).padStart(2, '0')
      const filename = `chart-capture-${yyyy}${mm}${dd}-${hh}${min}${ss}.png`

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
    }, 'image/png')
  } catch {
    // All errors silently ignored — capture is best-effort
  }
}
