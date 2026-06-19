import type { FibLevel, FibTemplateKey, Timeframe, ToolType } from '../types/chart'

function createFibLevels(ratios: number[]) {
    return ratios.map((ratio) => ({
        ratio,
        label: ratio.toString(),
        color: '#000000',
        visible: true,
    }))
}

export const TIMEFRAMES: Timeframe[] = ['m1', 'm5', 'm15', 'h1']

export const DRAW_TOOL_OPTIONS: ToolType[] = [
    'FVG',
    'FVG_FIRST',
    'VLINE',
    'FIB',
    'OB',
    'EQH',
    'EQL',
    'SH',
    'SL',
    'ORG',
    'NDOG',
    'NWOG',
    'ORG_RECENT_5',
    'GAP_RECENT_5',
    'ENTRY',
    'MKT_ANNOT',
]

export const FIB_TEMPLATES: Record<FibTemplateKey, { label: string; levels: FibLevel[] }> = {
    fibo_quadrant: {
        label: 'Fibo Quadrant',
        levels: createFibLevels([0, 0.25, 0.5, 0.75, 1]),
    },
    premium_discount: {
        label: 'Premium Discount Fibo',
        levels: createFibLevels([0, 0.5, 1]),
    },
    ict_ote: {
        label: 'ICT OTE',
        levels: createFibLevels([0, 0.5, 0.62, 0.705, 0.79, 1, -0.27, -0.62, -1]),
    },
    ict_standard_deviation: {
        label: 'ICT Standard Deviation',
        levels: createFibLevels([0, 0.25, 0.5, 0.75, 1, -0.5, -1, -1.5, -2, -2.5]),
    },
}

export function getDefaultFibLevels(templateKey: FibTemplateKey) {
    return FIB_TEMPLATES[templateKey].levels.map((level) => ({ ...level }))
}

export function getFibTemplateLabel(templateKey: FibTemplateKey) {
    return FIB_TEMPLATES[templateKey].label
}

export function getToolLabel(tool: ToolType) {
    if (tool === 'FVG') return 'Fair Value Gap'
    if (tool === 'FVG_FIRST') return 'First Fair Value Gap'
    if (tool === 'VLINE') return 'Vertical Line'
    if (tool === 'FIB') return 'Fibonacci'
    if (tool === 'OB') return 'Order Block'
    if (tool === 'EQH') return 'Equal Highs'
    if (tool === 'EQL') return 'Equal Lows'
    if (tool === 'SH') return 'Single High'
    if (tool === 'SL') return 'Single Low'
    if (tool === 'NDOG') return 'New Day Opening Gap'
    if (tool === 'NWOG') return 'New Week Opening Gap'
    if (tool === 'ORG_RECENT_5') return 'Draw 5 Most Recent ORG'
    if (tool === 'GAP_RECENT_5') return 'Draw 5 Most Recent NDOG/NWOG'
    if (tool === 'ENTRY') return 'Entry'
    if (tool === 'MKT_ANNOT') return 'Market Annotations'
    return 'Opening Range Gap'
}
