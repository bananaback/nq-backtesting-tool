import { DRAW_TOOL_OPTIONS, type DrawMenuState, type ToolType } from '../chartTypes'
import { getToolLabel } from '../chartUtils'

type DrawMenuProps = {
    position: Exclude<DrawMenuState, null>
    onCreateDrawing: (type: ToolType) => void
}

function DrawMenu({ position, onCreateDrawing }: DrawMenuProps) {
    return (
        <div className="draw-menu" style={{ top: position.y, left: position.x }}>
            <div className="draw-menu__title">Select Tool</div>
            {DRAW_TOOL_OPTIONS.map((tool) => (
                <button key={tool} type="button" onClick={() => onCreateDrawing(tool)}>
                    {getToolLabel(tool)}
                </button>
            ))}
        </div>
    )
}

export default DrawMenu