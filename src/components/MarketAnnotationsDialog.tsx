import { useState, type FormEvent, type ChangeEvent, type JSX } from 'react'

type MarketAnnotationsDialogProps = {
    onClose: () => void
    onConfirm: (dateStr: string) => void
}

/** Renders a modal dialog for selecting a date to generate market annotations.
 *
 * Args:
 *     onClose: Called when the modal is dismissed (Cancel, backdrop click, or ×).
 *     onConfirm: Called with the selected date string in "YYYY-MM-DD" format when the user clicks Confirm.
 *
 * Returns:
 *     The modal JSX element.
 */
function MarketAnnotationsDialog({ onClose, onConfirm }: MarketAnnotationsDialogProps): JSX.Element {
    const [date, setDate] = useState('')

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!date) {
            return
        }
        onConfirm(date)
    }

    return (
        <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
            <div className="modal-card" role="dialog" aria-modal="true" aria-label="Market annotations" onMouseDown={(event) => event.stopPropagation()}>
                <div className="modal-card__header">
                    <div className="modal-card__title">Market Annotations</div>
                    <button type="button" className="modal-card__close" onClick={onClose} aria-label="Close market annotations dialog">
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
                        <button type="submit" className="modal-btn modal-btn--primary" disabled={!date}>
                            Confirm
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default MarketAnnotationsDialog
