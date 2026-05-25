import type { Drawing } from '../chartTypes'
import { formatObjectTime } from '../chartUtils'

type ObjectsPanelProps = {
    drawings: Drawing[]
    onRemove: (id: number) => void
    onClose: () => void
}

function ObjectsPanel({ drawings, onRemove, onClose }: ObjectsPanelProps) {
    return (
        <aside className="objects-panel">
            <div className="objects-panel__header">
                <span>Object Tree</span>
                <button type="button" onClick={onClose} aria-label="Close objects panel">
                    &times;
                </button>
            </div>
            <div className="objects-panel__list">
                {drawings.length === 0 ? (
                    <div className="empty-state">No objects drawn.</div>
                ) : (
                    [...drawings]
                        .reverse()
                        .map((drawing) => {
                            const displayTime = formatObjectTime(drawing.time)

                            return (
                                <div key={drawing.id} className="object-item">
                                    <div className="object-item__meta">
                                        <span className="object-item__id">#{drawing.id}</span>
                                        <span className="object-item__type">{drawing.type}</span>
                                        <span className="object-item__time">@ {displayTime}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="object-item__delete"
                                        onClick={() => onRemove(drawing.id)}
                                        aria-label={`Delete ${drawing.type} ${drawing.id}`}
                                    >
                                        &times;
                                    </button>
                                </div>
                            )
                        })
                )}
            </div>
        </aside>
    )
}

export default ObjectsPanel