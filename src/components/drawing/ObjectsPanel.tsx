import type { Drawing } from '../../types/chart'
import { formatObjectTime } from '../../utils/time'

type ObjectsPanelProps = {
    drawings: Drawing[]
    onRemove: (id: number) => void
    onClose: () => void
    selectedDrawingId?: number | null
    onSelect?: (id: number | null) => void
    onEditDrawing?: (drawing: Drawing) => void
}
function ObjectsPanel({ drawings, onRemove, onClose, selectedDrawingId, onSelect, onEditDrawing }: ObjectsPanelProps) {
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
                            const isSelected = selectedDrawingId === drawing.id

                            return (
                                <div
                                    key={drawing.id}
                                    className={isSelected ? 'object-item is-selected' : 'object-item'}
                                    onClick={() => {
                                        onSelect && onSelect(drawing.id)
                                    }}
                                >
                                    <div className="object-item__meta">
                                        <span className="object-item__id">#{drawing.id}</span>
                                        <span className="object-item__type">{drawing.type}</span>
                                        <span className="object-item__time">@ {displayTime}</span>
                                    </div>
                                    <div className="object-item__actions">
                                        {onEditDrawing ? (
                                            <button
                                                type="button"
                                                className="object-item__setup"
                                                onClick={(e) => { e.stopPropagation(); onEditDrawing(drawing) }}
                                                aria-label={`Setup ${drawing.type} ${drawing.id}`}
                                            >
                                                Setup
                                            </button>
                                        ) : null}
                                        <button
                                            type="button"
                                            className="object-item__delete"
                                            onClick={(e) => { e.stopPropagation(); onRemove(drawing.id) }}
                                            aria-label={`Delete ${drawing.type} ${drawing.id}`}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                )}
            </div>
        </aside>
    )
}

export default ObjectsPanel
