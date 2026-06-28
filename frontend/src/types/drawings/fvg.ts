export type FvgDrawing = {
    id: number
    type: 'FVG'
    time: string
    top: number
    bot: number
    lengthMinutes?: number | null
    color: string
    border: string
}

export type VerticalLineDrawing = {
    id: number
    type: 'VLINE'
    time: string
    color: string
}
