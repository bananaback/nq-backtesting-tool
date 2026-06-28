import { DRAW_TOOL_OPTIONS, type ToolType } from '../../types/chart'
import type { DrawMenuState } from '../../types/state'
import { getToolLabel } from '../../constants/chart'

type DrawMenuProps = {
    position: Exclude<DrawMenuState, null>
    onCreateDrawing: (type: ToolType) => void
}

function DrawMenu({ position, onCreateDrawing }: DrawMenuProps) {
    return (
        <div className="draw-menu" style={{ top: Math.max(8, position.y - 420), left: position.x }}>
            <div className="draw-menu__title">Select Tool</div>
            <div className="draw-menu__list">
                {DRAW_TOOL_OPTIONS.map((tool) => (
                    <button
                        key={tool}
                        type="button"
                        onClick={() => onCreateDrawing(tool)}
                        className={tool === 'ORG_RECENT_5' || tool === 'GAP_RECENT_5' ? 'draw-menu__bulk-tool' : undefined}
                    >
                        {getToolLabel(tool)}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default DrawMenu
