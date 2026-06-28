import type { Dispatch, SetStateAction } from 'react'
import type { Candle, Timeframe } from '../types/chart'
import type { ChartRuntimeState } from '../types/state'
import type { Drawing, EntryDirection } from '../types/drawings/index'
import { computeEntryStatus, snapPriceToCandleOHLC } from '../utils/drawing'
import { getIndexByTime, getTimeframeMinutes } from '../utils/time'

export function handleEntryPlacement(
    runtime: ChartRuntimeState,
    candleSpace: number,
    data: Candle[],
    hoverIndex: number,
    cursorPrice: number,
    snappedPrice: number,
    currentTf: Timeframe,
    candleFilterMinute: string,
    setEntryPlacementStep: Dispatch<SetStateAction<'pick-entry' | 'pick-sl' | 'pick-tp' | 'pick-width' | null>>,
    setDrawings: Dispatch<SetStateAction<ChartRuntimeState['drawings']>>,
    toggleDrawMode: () => void,
    drawCanvas: () => void,
): boolean {
    const pending = runtime.pendingEntryPlacement
    if (!pending) return false

    if (!pending.firstPoint) {
        // Click 1: set entry point
        runtime.pendingEntryPlacement = {
            ...pending,
            firstPoint: { time: data[hoverIndex].time, price: cursorPrice },
        }
        setEntryPlacementStep('pick-sl')
        drawCanvas()
        return true
    }
    if (!pending.secondPoint) {
        // Click 2: set stop loss point
        const entryPrice = pending.firstPoint.price
        const stopLossPrice = cursorPrice
        if (stopLossPrice === entryPrice) {
            window.alert('Stop loss cannot equal entry price.')
            return true
        }
        runtime.pendingEntryPlacement = {
            ...pending,
            secondPoint: { time: data[hoverIndex].time, price: stopLossPrice },
        }
        setEntryPlacementStep('pick-tp')
        drawCanvas()
        return true
    }
    if (!pending.thirdPoint) {
        // Click 3: set take profit point → transition to 'pick-width'
        const entryPriceClick3 = pending.firstPoint.price
        const stopLossPriceClick3 = pending.secondPoint.price
        const takeProfitPrice = cursorPrice
        const inferredDirectionClick3: EntryDirection = stopLossPriceClick3 < entryPriceClick3 ? 'LONG' : 'SHORT'
        if (inferredDirectionClick3 === 'LONG' && takeProfitPrice <= entryPriceClick3) {
            window.alert('LONG take profit must be above entry price.')
            return true
        }
        if (inferredDirectionClick3 === 'SHORT' && takeProfitPrice >= entryPriceClick3) {
            window.alert('SHORT take profit must be below entry price.')
            return true
        }
        runtime.pendingEntryPlacement = {
            ...pending,
            thirdPoint: { time: data[hoverIndex].time, price: takeProfitPrice },
        }
        setEntryPlacementStep('pick-width')
        drawCanvas()
        return true
    }
    // Click 4: set width → compute status and finalize drawing
    const entryPrice = pending.firstPoint.price
    const stopLossPrice = pending.secondPoint.price
    const takeProfitPrice = pending.thirdPoint.price
    const inferredDirection: EntryDirection = stopLossPrice < entryPrice ? 'LONG' : 'SHORT'
    const entryIndex = getIndexByTime(data, pending.firstPoint.time)
    const widthInCandles = Math.max(1, hoverIndex - entryIndex)
    const timeframeMinutes = getTimeframeMinutes(currentTf)
    const lengthMinutes = widthInCandles * timeframeMinutes
    const status = computeEntryStatus(data, entryIndex, widthInCandles, inferredDirection, stopLossPrice, takeProfitPrice)
    const newId = runtime.drawingIdCounter
    const nextDrawing: Drawing = {
        id: newId,
        type: 'ENTRY',
        time: pending.firstPoint.time,
        entryPrice,
        stopLossPrice,
        takeProfitPrice,
        direction: inferredDirection,
        status,
        widthInCandles,
        lengthMinutes,
    }
    runtime.drawingIdCounter += 1
    runtime.drawings = [...runtime.drawings, nextDrawing]
    setDrawings(runtime.drawings)
    runtime.pendingEntryPlacement = null
    setEntryPlacementStep(null)
    toggleDrawMode()
    runtime.isDraggingChart = false
    runtime.isDraggingAxis = false
    drawCanvas()
    return true
}
