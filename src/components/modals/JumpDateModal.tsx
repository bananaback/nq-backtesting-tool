import { useState, type FormEvent, type ChangeEvent } from 'react'

type JumpDateModalProps = {
    onClose: () => void
    onJump: (date: string) => void
}

/** Renders a modal form for jumping to a date on the chart.
 *
 * Args:
 *     onClose: Called when modal is dismissed (Cancel, backdrop click, or ×).
 *     onJump: Called with date string when user confirms. Then modal is closed.
 *
 * Returns:
 *     The modal JSX element.
 */
function JumpDateModal({ onClose, onJump }: JumpDateModalProps) {
    const [date, setDate] = useState('')

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!date) {
            window.alert('Please select a date.')
            return
        }
        onJump(date)
        onClose()
    }

    return (
        <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
            <div className="modal-card" role="dialog" aria-modal="true" aria-label="Jump to date" onMouseDown={(event) => event.stopPropagation()}>
                <div className="modal-card__header">
                    <div className="modal-card__title">Jump to Date</div>
                    <button type="button" className="modal-card__close" onClick={onClose} aria-label="Close jump to date">
                        &times;
                    </button>
                </div>

                <form className="modal-card__body" onSubmit={handleSubmit}>
                    <label className="modal-field">
                        <span className="modal-field__label">Date</span>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setDate(event.target.value)}
                        />
                    </label>

                    <div className="modal-card__actions">
                        <button type="button" className="modal-btn modal-btn--secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="modal-btn modal-btn--primary">
                            Go
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default JumpDateModal
