export type OrgDrawing = {
    id: number
    type: 'ORG' | 'NDOG' | 'NWOG'
    time: string
    top: number
    bot: number
    price1614: number
    price0930: number
    lengthMinutes?: number | null
    fillColor?: string
    borderColor?: string
}
