export type FibTemplateKey = 'fibo_quadrant' | 'premium_discount' | 'ict_ote' | 'ict_standard_deviation'

export type FibLineStyle = 'normal' | 'dashed' | 'dotted'

export type FibLevel = {
    ratio: number
    label: string
    color: string
    visible: boolean
}

export type FibDrawing = {
    id: number
    type: 'FIB'
    time: string
    time2: string
    price1: number
    price2: number
    templateKey: FibTemplateKey
    extendRight: boolean
    reverse: boolean
    lineStyle: FibLineStyle
    lineWidth: number
    levels: FibLevel[]
}
