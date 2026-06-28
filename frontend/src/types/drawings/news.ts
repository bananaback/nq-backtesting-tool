import type { NewsImpact } from '../chart'

export type NewsDrawing = {
    id: number
    type: 'NEWS' | 'NEWS_ALLDAY'
    time: string
    allDayEndTime?: string
    impact: NewsImpact
    event: string
    color: string
}
