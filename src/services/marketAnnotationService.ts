import type { Candle } from '../types/chart'
import { findCandleByTime } from '../utils/time'

export function findTimeByDayAndClock(
    data: Candle[],
    day: string,
    clock: string,
): Candle | null {
    return findCandleByTime(data, day + 'T' + clock)
}
