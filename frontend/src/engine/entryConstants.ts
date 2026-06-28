import type { EntryStatus } from '../types/drawings/entry'

export const SPLIT_COLORS = {
    realizedProfitFill: 'rgba(22, 163, 74, 0.22)',
    realizedProfitStroke: 'rgba(22, 163, 74, 0.45)',
    unrealizedProfitFill: 'rgba(34, 197, 94, 0.08)',
    unrealizedProfitStroke: 'rgba(34, 197, 94, 0.20)',
    potentialProfitFill: 'rgba(34, 197, 94, 0.10)',
    potentialProfitStroke: 'rgba(34, 197, 94, 0.22)',
    realizedLossFill: 'rgba(220, 38, 38, 0.22)',
    realizedLossStroke: 'rgba(220, 38, 38, 0.45)',
    unrealizedLossFill: 'rgba(239, 68, 68, 0.08)',
    unrealizedLossStroke: 'rgba(239, 68, 68, 0.20)',
    atRiskLossFill: 'rgba(239, 68, 68, 0.10)',
    atRiskLossStroke: 'rgba(239, 68, 68, 0.22)',
    neutralProfitFill: 'rgba(34, 197, 94, 0.10)',
    neutralProfitStroke: 'rgba(34, 197, 94, 0.22)',
    neutralLossFill: 'rgba(239, 68, 68, 0.10)',
    neutralLossStroke: 'rgba(239, 68, 68, 0.22)',
}

export const STATUS_COLORS: Record<EntryStatus, {
    profitFill: string
    profitStroke: string
    lossFill: string
    lossStroke: string
}> = {
    IN_PROGRESS: {
        profitFill: 'rgba(156, 163, 175, 0.12)',
        profitStroke: 'rgba(156, 163, 175, 0.25)',
        lossFill: 'rgba(156, 163, 175, 0.08)',
        lossStroke: 'rgba(156, 163, 175, 0.18)',
    },
    TP_HIT: {
        profitFill: 'rgba(34, 197, 94, 0.35)',
        profitStroke: 'rgba(22, 163, 74, 0.7)',
        lossFill: 'rgba(239, 68, 68, 0.05)',
        lossStroke: 'rgba(239, 68, 68, 0.1)',
    },
    SL_HIT: {
        profitFill: 'rgba(34, 197, 94, 0.05)',
        profitStroke: 'rgba(34, 197, 94, 0.1)',
        lossFill: 'rgba(220, 38, 38, 0.35)',
        lossStroke: 'rgba(185, 28, 28, 0.7)',
    },
}

export const TAB_COLORS: Record<EntryStatus, { entry: string; sl: string; tp: string }> = {
    IN_PROGRESS: { entry: '#6b7280', sl: '#9ca3af', tp: '#9ca3af' },
    TP_HIT: { entry: '#22c55e', sl: '#ef4444', tp: '#16a34a' },
    SL_HIT: { entry: '#dc2626', sl: '#b91c1c', tp: '#86efac' },
}
