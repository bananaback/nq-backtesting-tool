import { useState, type FormEvent, type ChangeEvent } from 'react'

type BacktestSectionModalProps = {
    defaultName: string
    onClose: () => void
    onSubmit: (name: string, date: string, time: string) => Promise<boolean>
}

/** Renders a modal form for creating a new backtest section with name, date, and time.
 *
 * Args:
 *     defaultName: Pre-filled value for the section name input.
 *     onClose: Called when modal is dismissed (Cancel, backdrop click, or ×).
 *     onSubmit: Called with (name, date "YYYY-MM-DD", time "HH:MM"). Returns true to close, false to stay open.
 *
 * Returns:
 *     The modal JSX element.
 */
function BacktestSectionModal({ defaultName, onClose, onSubmit }: BacktestSectionModalProps) {
    const [name, setName] = useState(defaultName)
    const [date, setDate] = useState('')
    const [time, setTime] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!date || !time) {
            window.alert('Please select both a date and time.')
            return
        }
        setIsSubmitting(true)
        const finalName = name.trim() || defaultName
        const success = await onSubmit(finalName, date, time)
        if (success) {
            onClose()
        }
        setIsSubmitting(false)
    }

    return (
        <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
            <div className="modal-card" role="dialog" aria-modal="true" aria-label="New backtest section" onMouseDown={(event) => event.stopPropagation()}>
                <div className="modal-card__header">
                    <div className="modal-card__title">New Backtest Section</div>
                    <button type="button" className="modal-card__close" onClick={onClose} aria-label="Close backtest section editor">
                        &times;
                    </button>
                </div>

                <form className="modal-card__body" onSubmit={handleSubmit}>
                    <label className="modal-field">
                        <span className="modal-field__label">Section name</span>
                        <input
                            type="text"
                            value={name}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
                        />
                    </label>

                    <label className="modal-field">
                        <span className="modal-field__label">Date</span>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setDate(event.target.value)}
                        />
                    </label>

                    <label className="modal-field">
                        <span className="modal-field__label">Time</span>
                        <input
                            type="time"
                            required
                            value={time}
                            onChange={(event: ChangeEvent<HTMLInputElement>) => setTime(event.target.value)}
                        />
                    </label>

                    <div className="modal-card__actions">
                        <button type="button" className="modal-btn modal-btn--secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="modal-btn modal-btn--primary" disabled={isSubmitting}>
                            OK
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default BacktestSectionModal
