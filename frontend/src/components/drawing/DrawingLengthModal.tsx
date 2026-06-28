import { useEffect, useState, type FormEvent } from 'react'
import type { Drawing } from '../../types/chart'

type DrawingLengthModalProps = {
    drawing: Drawing
    onClose: () => void
    onSave: (drawingId: number, lengthMinutes: number | null) => void
}

function DrawingLengthModal({ drawing, onClose, onSave }: DrawingLengthModalProps) {
    const canEditLength = drawing.type !== 'VLINE' && drawing.type !== 'FIB'
    const initialLengthMinutes = drawing.type === 'VLINE' || drawing.type === 'FIB' || drawing.type === 'ENTRY' ? null : drawing.lengthMinutes
    const [isInfinite, setIsInfinite] = useState(initialLengthMinutes === null || initialLengthMinutes === undefined)
    const [lengthValue, setLengthValue] = useState(String(initialLengthMinutes ?? ''))

    useEffect(() => {
        const nextLengthMinutes = drawing.type === 'VLINE' || drawing.type === 'FIB' || drawing.type === 'ENTRY' ? null : drawing.lengthMinutes
        setIsInfinite(nextLengthMinutes === null || nextLengthMinutes === undefined)
        setLengthValue(String(nextLengthMinutes ?? ''))
    }, [drawing])

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!canEditLength) return

        const parsedLength = Number.parseFloat(lengthValue)
        if (!isInfinite && (!Number.isFinite(parsedLength) || parsedLength < 0)) {
            window.alert('Enter a valid non-negative length in minutes, or enable Infinite.')
            return
        }

        onSave(drawing.id, isInfinite ? null : parsedLength)
        onClose()
    }

    return (
        <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
            <div className="modal-card" role="dialog" aria-modal="true" aria-label={`Edit length for ${drawing.type} ${drawing.id}`} onMouseDown={(event) => event.stopPropagation()}>
                <div className="modal-card__header">
                    <div>
                        <div className="modal-card__title">Edit Length</div>
                        <div className="modal-card__subtitle">#{drawing.id} {drawing.type}</div>
                    </div>
                    <button type="button" className="modal-card__close" onClick={onClose} aria-label="Close length editor">
                        &times;
                    </button>
                </div>

                {!canEditLength ? (
                    <div className="modal-card__body">
                        <p className="modal-card__note">This object does not use a right-side length setting.</p>
                    </div>
                ) : (
                    <form className="modal-card__body" onSubmit={handleSubmit}>
                        <label className="modal-field">
                            <span className="modal-field__label">Length in minutes</span>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={lengthValue}
                                disabled={isInfinite}
                                onChange={(event) => setLengthValue(event.target.value)}
                                placeholder="Infinity"
                            />
                        </label>

                        <label className="modal-checkbox">
                            <input
                                type="checkbox"
                                checked={isInfinite}
                                onChange={(event) => setIsInfinite(event.target.checked)}
                            />
                            <span>Infinite length</span>
                        </label>

                        <div className="modal-card__actions">
                            <button type="button" className="modal-btn modal-btn--secondary" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="modal-btn modal-btn--primary">
                                Save
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}

export default DrawingLengthModal
