import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { Timeframe } from '../types/chart'
import type { ChartRuntimeState } from '../types/state'
import { getTimeframeMinutes } from '../utils/time'

type CandleFilterDeps = {
    candleFilterMinute: string
    setCandleFilterMinute: Dispatch<SetStateAction<string>>
    currentTF: Timeframe
    runtimeRef: RefObject<ChartRuntimeState>
    setIsPickingCandleFilter: Dispatch<SetStateAction<boolean>>
    drawCanvas: () => void
}

export function createCandleFilter({
    candleFilterMinute,
    setCandleFilterMinute,
    currentTF,
    runtimeRef,
    setIsPickingCandleFilter,
    drawCanvas,
}: CandleFilterDeps) {
    const shiftCandleFilterMinute = (deltaMinutes: number) => {
        if (!candleFilterMinute) return
        const base = new Date(candleFilterMinute)
        if (Number.isNaN(base.getTime())) return
        const stepMinutes = getTimeframeMinutes(currentTF)
        base.setMinutes(base.getMinutes() + deltaMinutes * stepMinutes)
        const nextValue = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}T${String(base.getHours()).padStart(2, '0')}:${String(base.getMinutes()).padStart(2, '0')}`
        setCandleFilterMinute(nextValue)
    }

    const startCandleFilterPick = () => {
        runtimeRef.current.pendingCandleFilterPick = true
        setIsPickingCandleFilter(true)
        drawCanvas()
    }

    return { shiftCandleFilterMinute, startCandleFilterPick }
}
