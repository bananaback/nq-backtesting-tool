import { useEffect, useState, type FormEvent } from 'react'
import type { FibDrawing, FibLineStyle, FibTemplateKey } from '../chartTypes'
import { FIB_TEMPLATES, getDefaultFibLevels } from '../chartUtils'

type FibSetupModalProps = {
    drawing: FibDrawing
    onClose: () => void
    onSave: (drawingId: number, updates: Pick<FibDrawing, 'templateKey' | 'extendRight' | 'reverse' | 'lineStyle' | 'lineWidth' | 'levels'>) => void
}

function FibSetupModal({ drawing, onClose, onSave }: FibSetupModalProps) {
    const [templateKey, setTemplateKey] = useState<FibTemplateKey>(drawing.templateKey)
    const [extendRight, setExtendRight] = useState(drawing.extendRight)
    const [reverse, setReverse] = useState(drawing.reverse ?? false)
    const [lineStyle, setLineStyle] = useState<FibLineStyle>(drawing.lineStyle ?? 'normal')
    const [lineWidth, setLineWidth] = useState(String(drawing.lineWidth ?? 1.5))
    const [levels, setLevels] = useState(drawing.levels)

    useEffect(() => {
        setTemplateKey(drawing.templateKey)
        setExtendRight(drawing.extendRight)
        setReverse(drawing.reverse ?? false)
        setLineStyle(drawing.lineStyle ?? 'normal')
        setLineWidth(String(drawing.lineWidth ?? 1.5))
        setLevels(drawing.levels)
    }, [drawing])

    const handleTemplateChange = (nextTemplateKey: FibTemplateKey) => {
        setTemplateKey(nextTemplateKey)
        setLevels(getDefaultFibLevels(nextTemplateKey))
    }

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const parsedLineWidth = Number.parseFloat(lineWidth)
        if (!Number.isFinite(parsedLineWidth) || parsedLineWidth <= 0) {
            window.alert('Line width must be a positive number.')
            return
        }

        onSave(drawing.id, { templateKey, extendRight, reverse, lineStyle, lineWidth: parsedLineWidth, levels })
        onClose()
    }

    return (
        <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
            <div className="modal-card modal-card--fib" role="dialog" aria-modal="true" aria-label={`Edit Fibonacci ${drawing.id}`} onMouseDown={(event) => event.stopPropagation()}>
                <div className="modal-card__header">
                    <div>
                        <div className="modal-card__title">Fibonacci Setup</div>
                        <div className="modal-card__subtitle">#{drawing.id} {drawing.type}</div>
                    </div>
                    <button type="button" className="modal-card__close" onClick={onClose} aria-label="Close Fibonacci setup">
                        &times;
                    </button>
                </div>

                <form className="modal-card__body fib-setup" onSubmit={handleSubmit}>
                    <label className="modal-field">
                        <span className="modal-field__label">Template</span>
                        <select value={templateKey} onChange={(event) => handleTemplateChange(event.target.value as FibTemplateKey)}>
                            {Object.entries(FIB_TEMPLATES).map(([key, template]) => (
                                <option key={key} value={key}>
                                    {template.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="modal-checkbox">
                        <input
                            type="checkbox"
                            checked={extendRight}
                            onChange={(event) => setExtendRight(event.target.checked)}
                        />
                        <span>Extend levels right</span>
                    </label>

                    <label className="modal-checkbox">
                        <input
                            type="checkbox"
                            checked={reverse}
                            onChange={(event) => setReverse(event.target.checked)}
                        />
                        <span>Reverse</span>
                    </label>

                    <div className="fib-setup__line-options">
                        <label className="modal-field">
                            <span className="modal-field__label">Line Style</span>
                            <select value={lineStyle} onChange={(event) => setLineStyle(event.target.value as FibLineStyle)}>
                                <option value="normal">Normal line</option>
                                <option value="dashed">Dashed</option>
                                <option value="dotted">Dotted</option>
                            </select>
                        </label>

                        <label className="modal-field">
                            <span className="modal-field__label">Line Width</span>
                            <input
                                type="number"
                                min="0.5"
                                step="0.5"
                                value={lineWidth}
                                onChange={(event) => setLineWidth(event.target.value)}
                            />
                        </label>
                    </div>

                    <div className="fib-setup__levels">
                        {levels.map((level, index) => (
                            <div key={`${level.label}-${level.ratio}-${index}`} className="fib-level-row">
                                <label className="modal-checkbox fib-level-row__visible">
                                    <input
                                        type="checkbox"
                                        checked={level.visible}
                                        onChange={(event) => {
                                            const nextLevels = [...levels]
                                            nextLevels[index] = { ...nextLevels[index], visible: event.target.checked }
                                            setLevels(nextLevels)
                                        }}
                                    />
                                    <span>{level.label}</span>
                                </label>
                                <span className="fib-level-row__ratio">{level.ratio.toFixed(3)}</span>
                                <input
                                    className="fib-level-row__color"
                                    type="color"
                                    value={level.color}
                                    onChange={(event) => {
                                        const nextLevels = [...levels]
                                        nextLevels[index] = { ...nextLevels[index], color: event.target.value }
                                        setLevels(nextLevels)
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="modal-card__actions">
                        <button type="button" className="modal-btn modal-btn--secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="modal-btn modal-btn--primary">
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default FibSetupModal