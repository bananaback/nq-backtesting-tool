import { useEffect, useState } from 'react'
import type { Timeframe } from '../types/chart'

type TfQuickInput = { visible: boolean; value: string }

type UseTfQuickInputReturn = {
    tfQuickInput: TfQuickInput
    setTfQuickInput: (v: TfQuickInput) => void
}

export function useTfQuickInput(
    changeTimeframe: (tf: Timeframe) => void,
    onEscapeWhenHidden?: () => void,
): UseTfQuickInputReturn {
    const [tfQuickInput, setTfQuickInput] = useState<TfQuickInput>({ visible: false, value: '' })

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
            if ((e.target as HTMLElement)?.isContentEditable) return

            const key = e.key

            if (tfQuickInput.visible) {
                if (key === 'Enter') {
                    e.preventDefault()
                    const val = tfQuickInput.value.toLowerCase().trim()
                    if (val === '1h' || val === '60') changeTimeframe('h1')
                    else if (val === '1') changeTimeframe('m1')
                    else if (val === '5') changeTimeframe('m5')
                    else if (val === '15') changeTimeframe('m15')
                    setTfQuickInput({ visible: false, value: '' })
                } else if (key === 'Escape') {
                    setTfQuickInput({ visible: false, value: '' })
                } else if (key === 'Backspace') {
                    const next = tfQuickInput.value.slice(0, -1)
                    setTfQuickInput({ visible: next.length > 0, value: next })
                } else if (/^[0-9hH]$/.test(key)) {
                    setTfQuickInput(prev => ({ ...prev, value: prev.value + key.toLowerCase() }))
                }
            } else {
                if (key === 'Escape') {
                    onEscapeWhenHidden?.()
                    return
                }
                if (/^[0-9]$/.test(key)) {
                    e.preventDefault()
                    setTfQuickInput({ visible: true, value: key })
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [tfQuickInput, changeTimeframe, onEscapeWhenHidden])

    return { tfQuickInput, setTfQuickInput }
}
