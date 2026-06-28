import { Candle, Drawing, getIndexByTime } from './candleUtils'

/** Render all drawing overlays onto chart canvas. Exact replica of chartRender.ts drawing logic. */
export function renderDrawings(
  ctx: CanvasRenderingContext2D,
  drawings: Drawing[],
  allCandles: Candle[],
  getY: (price: number) => number,
  candleSpace: number,
  viewStart: number,
  startIdx: number,
  endIdx: number,
  chartWidth: number,
  chartHeight: number,
  timeframeMinutes: number,
): void {
  for (const tool of drawings) {
    const index = getIndexByTime(allCandles, tool.time)
    if (index === -1) continue

    const x = (index - viewStart) * candleSpace + candleSpace / 2

    if (tool.type === 'VLINE') {
      ctx.save()
      ctx.strokeStyle = tool.color || 'rgba(0, 0, 0, 0.22)'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, chartHeight)
      ctx.stroke()
      ctx.restore()
    } else if (
      tool.type === 'PREV_DAY_RANGE_HIGH' ||
      tool.type === 'PREV_DAY_RANGE_LOW' ||
      tool.type === 'PREV_3DAY_RANGE_HIGH' ||
      tool.type === 'PREV_3DAY_RANGE_LOW' ||
      tool.type === 'PREV_DAY_3DAY_RANGE_HIGH' ||
      tool.type === 'PREV_DAY_3DAY_RANGE_LOW' ||
      tool.type === 'LONDON_HIGH' ||
      tool.type === 'LONDON_LOW' ||
      tool.type === 'ASIAN_HIGH' ||
      tool.type === 'ASIAN_LOW'
    ) {
      if (tool.price === undefined) continue
      const y = getY(tool.price)

      let endX: number
      if (tool.lengthMinutes != null) {
        const rectWidth = Math.max(1, (tool.lengthMinutes / timeframeMinutes) * candleSpace)
        endX = x + rectWidth
      } else {
        endX = chartWidth
      }

      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(endX, y)
      ctx.strokeStyle = tool.color || '#000000'
      ctx.lineWidth = 1
      // Use dashed style for range types to distinguish from session lines
      if (
        tool.type === 'PREV_DAY_RANGE_HIGH' ||
        tool.type === 'PREV_DAY_RANGE_LOW' ||
        tool.type === 'PREV_3DAY_RANGE_HIGH' ||
        tool.type === 'PREV_3DAY_RANGE_LOW' ||
        tool.type === 'PREV_DAY_3DAY_RANGE_HIGH' ||
        tool.type === 'PREV_DAY_3DAY_RANGE_LOW'
      ) {
        ctx.setLineDash([6, 3])
      }
      ctx.stroke()
      ctx.setLineDash([])
    } else if (tool.type === 'PM_HIGH' || tool.type === 'PM_LOW' || tool.type === 'OPEN_0000' || tool.type === 'OPEN_0830' || tool.type === 'OPEN_0930') {
      if (tool.price === undefined) continue
      const y = getY(tool.price)

      let scanStartIdx = index + 1
      let scanEndIdx = endIdx

      if (tool.breakScanStart) {
        const bsi = getIndexByTime(allCandles, tool.breakScanStart)
        if (bsi !== -1) scanStartIdx = bsi + 1
      }
      if (tool.endTime) {
        const eti = getIndexByTime(allCandles, tool.endTime)
        if (eti !== -1) scanEndIdx = eti
      }

      let crossCandleIdx = -1
      for (let i = scanStartIdx; i <= scanEndIdx; i++) {
        if (allCandles[i].low <= tool.price && tool.price <= allCandles[i].high) {
          crossCandleIdx = i
          break
        }
      }

      let endX: number
      if (crossCandleIdx !== -1) {
        endX = (crossCandleIdx - viewStart) * candleSpace + candleSpace / 2
      } else {
        endX = (scanEndIdx - viewStart) * candleSpace + candleSpace / 2
      }

      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(endX, y)
      ctx.strokeStyle = tool.color || '#000000'
      ctx.lineWidth = 1
      ctx.stroke()
      if (tool.type === 'OPEN_0000' || tool.type === 'OPEN_0830' || tool.type === 'OPEN_0930') {
        const label = tool.type === 'OPEN_0000' ? '0:00 Open' : tool.type === 'OPEN_0830' ? '8:30 Open' : '9:30 Open'
        ctx.save()
        ctx.fillStyle = tool.color || '#000000'
        ctx.font = 'bold 10px sans-serif'
        const labelX = Math.max(4, x + 4)
        ctx.fillText(label, labelX, y - 4)
        ctx.restore()
      }
    } else if (tool.type === 'FIB') {
      if (tool.price1 === undefined || tool.price2 === undefined || !tool.time2) continue
      const index2 = getIndexByTime(allCandles, tool.time2)
      if (index2 === -1) continue

      const x1 = x
      const x2 = (index2 - viewStart) * candleSpace + candleSpace / 2
      const leftX = Math.min(x1, x2)
      const rightX = Math.max(x1, x2)

      ctx.fillStyle = '#000000'
      ctx.beginPath()
      ctx.arc(x1, getY(tool.price1), 2.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x2, getY(tool.price2), 2.5, 0, Math.PI * 2)
      ctx.fill()

      if (tool.levels) {
        for (const level of tool.levels) {
          if (!level.visible) continue
          const levelPrice = tool.reverse
            ? tool.price2 + (tool.price1 - tool.price2) * level.ratio
            : tool.price1 + (tool.price2 - tool.price1) * level.ratio
          const y = getY(levelPrice)

          ctx.strokeStyle = level.color || '#000000'
          ctx.lineWidth = 1.5
          ctx.setLineDash([])
          ctx.beginPath()
          ctx.moveTo(leftX, y)
          ctx.lineTo(rightX, y)
          ctx.stroke()

          ctx.fillStyle = level.color || '#000000'
          ctx.font = 'bold 10px sans-serif'
          ctx.fillText(level.label, rightX - 44, y - 4)
        }
      }
    } else if (tool.type === 'FVG') {
      if (tool.top === undefined || tool.bot === undefined) continue
      const yTop = getY(tool.top)
      const yBot = getY(tool.bot)
      const rectHeight = Math.abs(yBot - yTop)
      const yDraw = Math.min(yTop, yBot)
      const lengthMinutes = tool.lengthMinutes ?? null
      const rectWidth = lengthMinutes === null ? chartWidth - x : Math.max(1, (lengthMinutes / timeframeMinutes) * candleSpace)

      ctx.fillStyle = tool.color || 'rgba(59, 130, 246, 0.15)'
      ctx.fillRect(x, yDraw, rectWidth, rectHeight)
      ctx.strokeStyle = tool.border || 'rgba(59, 130, 246, 0.4)'
      ctx.lineWidth = 1
      ctx.strokeRect(x, yDraw, rectWidth, rectHeight)
    } else if (tool.type === 'ORG') {
      if (tool.top === undefined || tool.bot === undefined || tool.price1614 === undefined || tool.price0930 === undefined) continue
      const yTop = getY(tool.top)
      const yBot = getY(tool.bot)
      const height = Math.abs(yBot - yTop)
      const yDraw = Math.min(yTop, yBot)
      const isPremium = tool.price0930 > tool.price1614
      const fillColor = isPremium ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)'
      const borderColor = isPremium ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'

      ctx.save()
      ctx.fillStyle = fillColor
      ctx.strokeStyle = borderColor
      ctx.setLineDash([2, 2])
      ctx.lineWidth = 1

      const rectWidth = chartWidth - x
      ctx.fillRect(x, yDraw, rectWidth, height)
      ctx.strokeRect(x, yDraw, rectWidth, height)

      ctx.setLineDash([4, 4])
      ctx.lineWidth = 0.5
      for (const lvl of [0.25, 0.5, 0.75]) {
        const yLvl = getY(tool.price1614 + (tool.price0930 - tool.price1614) * lvl)
        ctx.beginPath()
        ctx.moveTo(x, yLvl)
        ctx.lineTo(chartWidth, yLvl)
        ctx.stroke()

        ctx.fillStyle = isPremium ? '#15803d' : '#b91c1c'
        ctx.font = '8px sans-serif'
        ctx.fillText(lvl.toString(), chartWidth - 25, yLvl - 2)
      }

      ctx.restore()
    } else if (tool.type === 'NDOG' || tool.type === 'NWOG') {
      if (tool.top === undefined || tool.bot === undefined || tool.price1614 === undefined || tool.price0930 === undefined) continue
      const yTop = getY(tool.top)
      const yBot = getY(tool.bot)
      const height = Math.abs(yBot - yTop)
      const yDraw = Math.min(yTop, yBot)

      const fillColor = tool.fillColor ?? 'rgba(59, 130, 246, 0.14)'
      const borderColor = tool.borderColor ?? 'rgba(59, 130, 246, 0.65)'

      const rectX = Math.max(0, x)
      const rectWidth = chartWidth - rectX

      ctx.save()
      ctx.fillStyle = fillColor
      ctx.strokeStyle = borderColor
      ctx.setLineDash([2, 2])
      ctx.lineWidth = 1

      ctx.fillRect(rectX, yDraw, rectWidth, height)
      ctx.strokeRect(rectX, yDraw, rectWidth, height)

      ctx.setLineDash([4, 4])
      ctx.lineWidth = 0.5
      for (const lvl of [0.25, 0.5, 0.75]) {
        const yLvl = getY(tool.price1614 + (tool.price0930 - tool.price1614) * lvl)
        ctx.beginPath()
        ctx.moveTo(rectX, yLvl)
        ctx.lineTo(chartWidth, yLvl)
        ctx.stroke()

        ctx.fillStyle = borderColor
        ctx.font = '8px sans-serif'
        ctx.fillText(lvl.toString(), chartWidth - 25, yLvl - 2)
      }

      ctx.fillStyle = borderColor
      ctx.font = 'bold 10px sans-serif'
      ctx.fillText(tool.type, rectX + 8, yDraw + 14)

      ctx.restore()
    } else if (tool.type === 'OPEN_LINE') {
      if (tool.price === undefined) continue
      const y = getY(tool.price)

      const lineX = Math.max(0, x)

      ctx.save()
      ctx.strokeStyle = tool.color ?? 'rgba(107, 114, 128, 0.5)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])

      ctx.beginPath()
      ctx.moveTo(lineX, y)
      ctx.lineTo(chartWidth, y)
      ctx.stroke()

      ctx.restore()
    } else if (tool.type === 'SWING') {
      if (tool.price === undefined || !tool.swingType) continue
      const y = getY(tool.price)
      const isHigh = tool.swingType === 'HIGH'

      ctx.fillStyle = isHigh ? '#dc2626' : '#16a34a'
      ctx.beginPath()
      if (isHigh) {
        ctx.moveTo(x, y)
        ctx.lineTo(x - 4, y - 6)
        ctx.lineTo(x + 4, y - 6)
      } else {
        ctx.moveTo(x, y)
        ctx.lineTo(x - 4, y + 6)
        ctx.lineTo(x + 4, y + 6)
      }
      ctx.closePath()
      ctx.fill()

      const timeStr = tool.time.includes(' ')
        ? tool.time.split(' ')[1].slice(0, 5)
        : tool.time.includes('T')
          ? tool.time.split('T')[1].slice(0, 5)
          : ''
      ctx.fillStyle = isHigh ? '#dc2626' : '#16a34a'
      ctx.font = 'bold 9px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(timeStr, x, isHigh ? y - 10 : y + 16)
      ctx.textAlign = 'start'
    }
  }
}
