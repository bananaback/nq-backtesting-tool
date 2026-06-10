# PLAN.md — Market Annotations Drawing Tool

---

### Analysis

**Problem:** The charting application lacks a "Market Annotations" tool that generates a complete set of premarket/opening range analysis drawings for a given date. User needs one-click generation of 9 vertical time markers, 8 premarket range horizontal lines (with wick-break detection), and 4 opening range Fibonacci retracements — all for the 7:00–11:00 window on a selected date.

**Scope:** Type system (`chartTypes.ts`), tool label lookup (`chartUtils.ts`), drawing creation logic (`useTradingChartActions.ts`), canvas rendering (`chartRender.ts`), new dialog component (`MarketAnnotationsDialog.tsx`), controller hook (`useTradingChartController.ts`), ChartStage wiring (`ChartStage.tsx`), App wiring (`App.tsx`).

**Constraints:**
- Must reuse existing drawing types (VLINE, LineDrawing, FibDrawing) as individual objects in `runtime.drawings`
- Must always use m1 data for calculations regardless of current timeframe
- Premarket range lines start at window START, break scan starts after window END, line caps at 11:00
- Existing EQH/EQL/SH/SL rendering must remain unchanged (new LineDrawing fields are optional)
- Follow existing patterns: `ORG_RECENT_5` for bulk generation, `DrawingLengthModal` for modal styling

**Unknowns:** None.

---

### Task Index

```
T1: Extend type system — add MKT_ANNOT tool, PM_HIGH/PM_LOW line types, endTime/breakScanStart fields — src/chartTypes.ts + src/chartUtils.ts
T2: Create MarketAnnotationsDialog component — src/components/MarketAnnotationsDialog.tsx (new file)
T3: Add market annotations generation logic + MKT_ANNOT early-return in createDrawing — src/hooks/useTradingChartActions.ts
T4: Modify LineDrawing render to support endTime cap and breakScanStart — src/chartRender.ts
T5: Wire dialog state through controller → ChartStage → App — src/hooks/useTradingChartController.ts + src/components/ChartStage.tsx + src/App.tsx
```

---

### Dependency Graph

```
T1 -> T3
T1 -> T4
T2 -> T5
T3 -> T5
```

### Execution Levels

```
Level 0 (parallel): T1, T2
Level 1 (after Level 0): T3, T4
Level 2 (after Level 1): T5
```

---

### Contracts

---

#### T1: Extend type system for Market Annotations

**Location**
- File: `src/chartTypes.ts`
- Modify existing type declarations

- File: `src/chartUtils.ts`
- Modify `getToolLabel()` function

**Signature — chartTypes.ts**

Add `'MKT_ANNOT'` to the `ToolType` union (after `'ENTRY'` at line 18):
```typescript
export type ToolType =
    | 'FVG'
    | 'FVG_FIRST'
    | 'VLINE'
    | 'FIB'
    | 'OB'
    | 'EQH'
    | 'EQL'
    | 'SH'
    | 'SL'
    | 'ORG'
    | 'NDOG'
    | 'NWOG'
    | 'ORG_RECENT_5'
    | 'GAP_RECENT_5'
    | 'ENTRY'
    | 'MKT_ANNOT'       // <-- NEW
```

Extend `LineDrawing` type (line 85-92) with two optional fields and two new type discriminants:
```typescript
export type LineDrawing = {
    id: number
    type: 'EQH' | 'EQL' | 'SH' | 'SL' | 'PM_HIGH' | 'PM_LOW'   // extended
    time: string
    price: number
    lengthMinutes?: number | null
    endTime?: string          // NEW — caps break-detection scan and fallback endpoint
    breakScanStart?: string   // NEW — break scan starts after this time index
    color: string
}
```

Add `'MKT_ANNOT'` to `DRAW_TOOL_OPTIONS` array (line 161-177), appended after `'ENTRY'`:
```typescript
export const DRAW_TOOL_OPTIONS: ToolType[] = [
    'FVG',
    'FVG_FIRST',
    'VLINE',
    'FIB',
    'OB',
    'EQH',
    'EQL',
    'SH',
    'SL',
    'ORG',
    'NDOG',
    'NWOG',
    'ORG_RECENT_5',
    'GAP_RECENT_5',
    'ENTRY',
    'MKT_ANNOT',    // <-- NEW
]
```

**Signature — chartUtils.ts**

Add two new cases to `getToolLabel()` (line 213-229), before the final `return`:
```typescript
if (tool === 'MKT_ANNOT') return 'Market Annotations'
```

Note: `'PM_HIGH'` and `'PM_LOW'` are NOT ToolType values — they are LineDrawing.type discriminants only. ObjectsPanel renders `drawing.type` directly as raw string, so no label mapping needed for them.

**Input contract**
| Parameter | Constraint |
|-----------|------------|
| N/A | Type-level changes only — no runtime input |

**Output contract**
- `ToolType` union includes `'MKT_ANNOT'`
- `LineDrawing.type` includes `'PM_HIGH' | 'PM_LOW'`
- `LineDrawing` has optional `endTime?: string` and `breakScanStart?: string`
- `DRAW_TOOL_OPTIONS` includes `'MKT_ANNOT'`
- `getToolLabel('MKT_ANNOT')` returns `'Market Annotations'`
- `Drawing` and `DrawingDraft` unions automatically pick up changes via `LineDrawing`

**Side effects**
- None — type-level and pure function changes only

**Dependencies**
- None

**Task dependencies:** []

---

#### T2: Create MarketAnnotationsDialog component

**Location**
- File: `src/components/MarketAnnotationsDialog.tsx`
- New file

**Signature**
```typescript
type MarketAnnotationsDialogProps = {
    onClose: () => void
    onConfirm: (dateStr: string) => void
}

function MarketAnnotationsDialog({ onClose, onConfirm }: MarketAnnotationsDialogProps): JSX.Element
```

**Input contract**
| Parameter | Constraint |
|-----------|------------|
| `onClose` | Called when user clicks Cancel or clicks backdrop. Must not be null. |
| `onConfirm` | Called with selected date string in `"YYYY-MM-DD"` format when user clicks Confirm. Never called with empty/invalid date. |

**Output contract**
- Returns: A modal JSX element following existing modal pattern (`modal-backdrop` > `modal-card` > `modal-card__header` + `modal-card__body` + `modal-card__actions`)
- Contains: `<input type="date">` pre-filled to empty, Confirm button, Cancel button
- Confirm button disabled until a valid date is selected
- Form submit prevented if date is empty

**Side effects**
- None — pure presentational component. All state changes via callbacks.

**Dependencies**
- Reads: Existing CSS classes `modal-backdrop`, `modal-card`, `modal-card__header`, `modal-card__title`, `modal-card__body`, `modal-card__actions`, `modal-btn`, `modal-btn--primary`, `modal-btn--secondary`, `modal-card__close` (already in App.css, used by DrawingLengthModal)

**Task dependencies:** []

---

#### T3: Add market annotations generation logic

**Location**
- File: `src/hooks/useTradingChartActions.ts`
- Insert after line 25 (in `TradingChartActionsDeps` type): new dep `setMktAnnotDialogOpen`
- Insert after line 45 (in `createTradingChartActions` function params): destructure `setMktAnnotDialogOpen`
- Insert at line 383 (after ENTRY check, before `runtime.pendingFibPlacement = null` cleanup): new `MKT_ANNOT` early-return block
- Insert after line 357 (after `listAvailableDays` helper, before `createDrawing`): new `generateMarketAnnotations` function and helper `getCandlesInTimeRange`

**Signature — new dep**
```typescript
// Add to TradingChartActionsDeps (line 6-25):
setMktAnnotDialogOpen: Dispatch<SetStateAction<boolean>>
```

**Signature — MKT_ANNOT early-return in createDrawing**
```typescript
// Insert at line 383, before the pendingFibPlacement cleanup:
if (type === 'MKT_ANNOT') {
    runtime.pendingFibPlacement = null
    setFibPlacementStep(null)
    runtime.pendingEntryPlacement = null
    setEntryPlacementStep(null)
    setMktAnnotDialogOpen(true)
    drawMenuOpenRef.current = false
    setDrawMenu(null)
    runtime.selectedCandleIndex = null
    drawCanvas()
    return
}
```

**Signature — generateMarketAnnotations**
```typescript
const generateMarketAnnotations = (dateStr: string): void => {
    // Uses m1 data to generate all annotation drawings for the given date
    // dateStr: "YYYY-MM-DD" format
    // Generates drawings, adds to runtime.drawings, calls setDrawings
}
```

**Signature — getCandlesInTimeRange helper**
```typescript
const getCandlesInTimeRange = (
    data: Candle[],
    dateStr: string,
    startHHMM: string,   // "HH:MM" format, e.g. "07:00"
    endHHMM: string,      // "HH:MM" format, e.g. "07:30" — exclusive
): Candle[] => {
    // Returns all candles on dateStr with time >= startHHMM and < endHHMM
}
```

**Input contract — generateMarketAnnotations**
| Parameter | Constraint |
|-----------|------------|
| `dateStr` | `"YYYY-MM-DD"` format. Must be a valid date string. |

**Input contract — getCandlesInTimeRange**
| Parameter | Constraint |
|-----------|------------|
| `data` | m1 candle array from `runtime.chartData.m1` |
| `dateStr` | `"YYYY-MM-DD"` format |
| `startHHMM` | `"HH:MM"` 24h format with leading zeros, e.g. `"07:00"` |
| `endHHMM` | `"HH:MM"` 24h format, exclusive bound, e.g. `"07:30"` |

**Output contract — generateMarketAnnotations**
- Returns: void
- Side effects on success: generates up to 21 drawings (9 VLINE + 8 PM_HIGH/PM_LOW + 4 FIB), appends to `runtime.drawings`, calls `setDrawings`, selects newest drawing
- Side effects on failure (no m1 data): `window.alert('Load M1 data first to generate market annotations.')`
- Side effects on failure (no drawings generated for date): `window.alert('No annotations could be generated. Ensure M1 data covers 07:00–11:00 for the selected date.')`

**Generated drawings specification:**

1. **9 VerticalLineDrawing** — one per time marker at `:00` and `:30` from 07:00 to 11:00:
   ```
   { type: 'VLINE', time: <candle time on date at HH:MM>, color: '#7c3aed' }
   ```
   Skip if no candle found at exact time.

2. **8 LineDrawing** (PM_HIGH / PM_LOW) — for each premarket window (07:00–07:30, 08:00–08:30, 09:00–09:30, 10:00–10:30):
   - Calculate `high = max(candle.high)` and `low = min(candle.low)` from all m1 candles in `[start, end)`
   - Skip window if no candles found
   - High line:
     ```
     { type: 'PM_HIGH', time: <candle time at window start>, price: high,
       lengthMinutes: null, endTime: <candle time at 11:00>,
       breakScanStart: <candle time at window end>, color: 'rgba(59, 130, 246, 0.8)' }
     ```
   - Low line:
     ```
     { type: 'PM_LOW', time: <candle time at window start>, price: low,
       lengthMinutes: null, endTime: <candle time at 11:00>,
       breakScanStart: <candle time at window end>, color: 'rgba(239, 68, 68, 0.8)' }
     ```

3. **4 FibDrawing** — for each opening range window (07:30–08:00, 08:30–09:00, 09:30–10:00, 10:30–11:00):
   - Calculate `high` and `low` from all m1 candles in `[start, end)`
   - Skip window if no candles found
   - ```
     { type: 'FIB', time: <candle time at window start>, time2: <candle time at window end>,
       price1: high, price2: low, templateKey: 'fibo_quadrant',
       extendRight: false, reverse: false, lineStyle: 'normal', lineWidth: 1.5,
       levels: getDefaultFibLevels('fibo_quadrant') }
     ```

**Candle time lookup:** Use existing local `findTimeByDayAndClock(data, dateStr, clock)` to find the exact `.time` string for each boundary. All boundary times: `'07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00'`.

**getCandlesInTimeRange implementation detail:** Extract HH:MM from candle time via `time.includes(' ') ? time.split(' ')[1].slice(0, 5) : time.split('T')[1].slice(0, 5)`. Compare strings: `hhmm >= startHHMM && hhmm < endHHMM`. Filter to candles where `time.startsWith(dateStr)`.

**Return from createTradingChartActions:** Add `generateMarketAnnotations` to the returned object (line 565-580).

**Side effects**
- Mutates `runtime.drawings`, `runtime.drawingIdCounter`, `runtime.selectedDrawingId`
- Calls `setDrawings`, `setSelectedDrawingId`
- May call `window.alert` on error

**Dependencies**
- Calls: `findTimeByDayAndClock` (local, line 262), `getDefaultFibLevels` (from chartUtils)
- Reads: `runtimeRef.current.chartData.m1`, `runtimeRef.current.drawings`, `runtimeRef.current.drawingIdCounter`
- Imports: `getDefaultFibLevels` already imported at line 3

**Task dependencies:** [T1]

---

#### T4: Modify LineDrawing render for endTime and breakScanStart

**Location**
- File: `src/chartRender.ts`
- Replace lines 751-779 (the `'price' in tool` block)

**Signature**
No function signature change — modifies internal logic of the existing `runtime.drawings.forEach` callback in `drawTradingChart`.

**Input contract**
The `tool` variable (type `Drawing`, narrowed to `LineDrawing` by `'price' in tool`) may now have:
| Field | Type | Behavior when present |
|-------|------|-----------------------|
| `endTime` | `string` (candle time) | Caps the forward scan and fallback endpoint at this time index |
| `breakScanStart` | `string` (candle time) | Break-detection scan starts from this index + 1 instead of `index + 1` |

**Output contract**
- When neither field is set: behavior identical to current (scan from `index + 1` to `endIdx`, fallback to `endIdx`)
- When `breakScanStart` is set: scan starts from `getIndexByTime(data, tool.breakScanStart) + 1`
- When `endTime` is set: scan ends at `getIndexByTime(data, tool.endTime)` instead of `endIdx`; fallback endpoint is also `endTime` index
- When both are set: scan range is `[breakScanStart + 1, endTime]`
- If `getIndexByTime` returns -1 for either field: fall back to current behavior for that bound
- Line still draws from `x` (at `tool.time`) to computed `endX`
- All existing EQH/EQL/SH/SL drawings (which lack these fields) render identically to before

**Modified code block (replaces lines 751-779):**
```typescript
if ('price' in tool) {
    const y = getY(tool.price)
    const lengthMinutes = getDrawingLengthMinutes(tool.lengthMinutes)
    let endX: number
    if (lengthMinutes !== null) {
        const rectWidth = Math.max(1, (lengthMinutes / timeframeMinutes) * candleSpace)
        endX = x + rectWidth
    } else {
        // Determine scan boundaries
        let scanStartIdx = index + 1
        let scanEndIdx = endIdx

        if (tool.breakScanStart) {
            const bsi = getIndexByTime(data, tool.breakScanStart)
            if (bsi !== -1) scanStartIdx = bsi + 1
        }
        if (tool.endTime) {
            const eti = getIndexByTime(data, tool.endTime)
            if (eti !== -1) scanEndIdx = eti
        }

        // Scan forward for first candle wick crossing this price level
        let crossCandleIdx = -1
        for (let i = scanStartIdx; i <= scanEndIdx; i++) {
            if (data[i].low <= tool.price && tool.price <= data[i].high) {
                crossCandleIdx = i
                break
            }
        }
        if (crossCandleIdx !== -1) {
            endX = (crossCandleIdx - runtime.viewStart) * candleSpace + candleSpace / 2
        } else {
            endX = (scanEndIdx - runtime.viewStart) * candleSpace + candleSpace / 2
        }
    }
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(endX, y)
    ctx.strokeStyle = isSelected ? '#6d28d9' : tool.color
    ctx.lineWidth = isSelected ? 3 : 1
    ctx.stroke()
}
```

**Side effects**
- None — rendering only

**Dependencies**
- Calls: `getIndexByTime` (already imported), `getDrawingLengthMinutes` (already imported)
- Reads: `tool.breakScanStart`, `tool.endTime` (new optional fields from T1)

**Task dependencies:** [T1]

---

#### T5: Wire dialog state through controller → ChartStage → App

**Location**
- File: `src/hooks/useTradingChartController.ts`
- File: `src/components/ChartStage.tsx`
- File: `src/App.tsx`

**Signature — useTradingChartController.ts changes**

1. Add state (after line 127):
```typescript
const [mktAnnotDialogOpen, setMktAnnotDialogOpen] = useState(false)
```

2. Pass `setMktAnnotDialogOpen` to `createTradingChartActions` (in the call at line 186-205):
```typescript
setMktAnnotDialogOpen,
```

3. Destructure `generateMarketAnnotations` from actions result (line 172-186):
```typescript
generateMarketAnnotations,
```

4. Add wrapper function:
```typescript
const confirmMarketAnnotations = (dateStr: string) => {
    setMktAnnotDialogOpen(false)
    generateMarketAnnotations(dateStr)
    drawCanvas()
}

const closeMktAnnotDialog = () => {
    setMktAnnotDialogOpen(false)
}
```

5. Add to `UseTradingChartControllerReturn` type (line 12-60):
```typescript
mktAnnotDialogOpen: boolean
confirmMarketAnnotations: (dateStr: string) => void
closeMktAnnotDialog: () => void
```

6. Add to return object (line 341-389):
```typescript
mktAnnotDialogOpen,
confirmMarketAnnotations,
closeMktAnnotDialog,
```

**Signature — ChartStage.tsx changes**

1. Add to `ChartStageProps` (line 9-39):
```typescript
mktAnnotDialogOpen?: boolean
onCloseMktAnnotDialog?: () => void
onConfirmMktAnnot?: (dateStr: string) => void
```

2. Destructure new props in function signature (line 41-71)

3. Add import at top of file:
```typescript
import MarketAnnotationsDialog from './MarketAnnotationsDialog'
```

4. Add render block inside `.chart-row` div (after the FibSetupModal block, before closing `</div>` at line 140):
```tsx
{mktAnnotDialogOpen && onCloseMktAnnotDialog && onConfirmMktAnnot ? (
    <MarketAnnotationsDialog
        onClose={onCloseMktAnnotDialog}
        onConfirm={onConfirmMktAnnot}
    />
) : null}
```

**Signature — App.tsx changes**

1. Destructure new state from `useTradingChartController()` (line 20-67):
```typescript
mktAnnotDialogOpen,
confirmMarketAnnotations,
closeMktAnnotDialog,
```

2. Pass to `<ChartStage>` (line 177-216):
```typescript
mktAnnotDialogOpen={mktAnnotDialogOpen}
onCloseMktAnnotDialog={closeMktAnnotDialog}
onConfirmMktAnnot={confirmMarketAnnotations}
```

**Input contract**
| Parameter | Constraint |
|-----------|------------|
| `mktAnnotDialogOpen` | Boolean. When true, dialog renders. |
| `onCloseMktAnnotDialog` | Callback. Sets `mktAnnotDialogOpen` to false. |
| `onConfirmMktAnnot` | Callback receiving `"YYYY-MM-DD"` date string. Closes dialog then calls `generateMarketAnnotations`. |

**Output contract**
- Dialog appears as modal overlay when `mktAnnotDialogOpen` is true
- Confirm triggers drawing generation, then dialog closes
- Cancel/backdrop-click closes dialog without generating

**Side effects**
- State changes: `mktAnnotDialogOpen` toggles
- On confirm: triggers `generateMarketAnnotations` which mutates `runtime.drawings`

**Dependencies**
- Calls: `MarketAnnotationsDialog` component (from T2), `generateMarketAnnotations` (from T3)
- Reads: `setMktAnnotDialogOpen` passed to actions (T3)

**Task dependencies:** [T2, T3]

---

### Edge Cases

- **No m1 data loaded** → `generateMarketAnnotations` → `window.alert('Load M1 data first to generate market annotations.')`, no drawings created
- **Date has no candles in 07:00–11:00** → `generateMarketAnnotations` → `window.alert('No annotations could be generated. Ensure M1 data covers 07:00–11:00 for the selected date.')`
- **Partial data (e.g., only 07:00–09:00)** → Windows with candles generate normally; windows without candles silently skipped. Vertical lines at missing times silently skipped.
- **No wick break for premarket range line** → Line extends to 11:00 candle (handled by `endTime` fallback in render)
- **Multiple candles at exact boundary time** → `findTimeByDayAndClock` returns first match (sufficient since m1 has one candle per minute)
- **User clicks Confirm with empty date** → Confirm button disabled until valid date selected (handled by dialog component)
- **Existing EQH/EQL/SH/SL drawings** → `endTime` and `breakScanStart` are undefined → render falls through to original behavior (scanStartIdx = index + 1, scanEndIdx = endIdx)
- **User edits PM_HIGH/PM_LOW length via DrawingLengthModal** → Setting `lengthMinutes` overrides break-detection mode (existing render logic checks `lengthMinutes` first). This is acceptable manual override.

---

### New Dependencies

None — no new packages or imports beyond existing codebase.

---

### Risks

- **Risk:** `findTimeByDayAndClock` uses `.includes(clock)` which could false-match if clock string appears in date portion — **Mitigation:** All clocks use `"07:00"` format with leading zero; date portion is `"YYYY-MM-DD"` which cannot contain `":07:00"`. Safe.
- **Risk:** String comparison for HH:MM in `getCandlesInTimeRange` breaks if time format has seconds — **Mitigation:** Use `.slice(0, 5)` to extract exactly `"HH:MM"` before comparison.
- **Risk:** Large number of drawings (21 per date) may impact render performance — **Mitigation:** Existing codebase handles hundreds of drawings; 21 more is negligible. Each drawing is simple geometry.
