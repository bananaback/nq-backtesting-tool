# Plan: New Backtest Section Button + Modal

## Overview
Add a "New Section" button to the top bar. Clicking it opens a modal form where users enter a name, date, and time. On submit, the chart navigates to that date/time and auto-hides candles after that point. If the date/time doesn't exist in data, user gets an alert.

## Task Index

| Task | File | Description |
|------|------|-------------|
| T1 | `src/components/BacktestSectionModal.tsx` | New modal component with name/date/time form |
| T2 | `src/hooks/useTradingChartActions.ts` | Add `addBacktestSection()` function |
| T3 | `src/hooks/useTradingChartController.ts` | Wire `addBacktestSection` through controller |
| T4 | `src/components/TopBar.tsx` | Add button + render modal |
| T5 | `src/App.tsx` | Wire state and callbacks |

## Dependency Graph

```
T1 ──→ T4 ──→ T5
T2 ──→ T3 ──→ T5
```

## Phase Map

- Phase 1 (parallel): T1, T2
- Phase 2 (parallel): T3, T4
- Phase 3: T5

---

## T1: Create BacktestSectionModal component

**File:** `src/components/BacktestSectionModal.tsx` (new file)

**Signature:**
```ts
function BacktestSectionModal(props: BacktestSectionModalProps): JSX.Element
```

**Props:**
```ts
type BacktestSectionModalProps = {
    defaultName: string
    onClose: () => void
    onSubmit: (name: string, date: string, time: string) => Promise<boolean>
}
```

**Contract:**
- `defaultName`: pre-filled in name input
- `onClose`: called on Cancel, backdrop click, or × button
- `onSubmit`: called with (name, date "YYYY-MM-DD", time "HH:MM"). Returns Promise<boolean>. If true → close modal. If false → stay open (error already shown via alert).

**Internal state:** name (string, init=defaultName), date (string, init=""), time (string, init=""), isSubmitting (boolean, init=false)

**JSX structure (must use existing CSS classes):**
```
div.modal-backdrop (onMouseDown → onClose)
  div.modal-card (onMouseDown → stopPropagation)
    div.modal-card__header
      div.modal-card__title → "New Backtest Section"
      button.modal-card__close → ×
    form.modal-card__body (onSubmit → handleSubmit)
      label.modal-field → "Section name" + input text
      label.modal-field → "Date" + input date (required)
      label.modal-field → "Time" + input time (required)
      div.modal-card__actions
        button.modal-btn--secondary → "Cancel"
        button.modal-btn--primary (type=submit, disabled=isSubmitting) → "OK"
```

**handleSubmit:**
1. preventDefault
2. If !date or !time → alert('Please select both a date and time.') → return
3. isSubmitting = true
4. finalName = name.trim() || defaultName
5. success = await onSubmit(finalName, date, time)
6. If success → onClose()
7. isSubmitting = false

---

## T2: Add addBacktestSection action

**File:** `src/hooks/useTradingChartActions.ts`

**Type changes — add to TradingChartActionsDeps:**
```ts
setCandleFilterMinute?: Dispatch<SetStateAction<string>>
setRenderAfterFilterMinute?: Dispatch<SetStateAction<boolean>>
```

**New function signature:**
```ts
addBacktestSection(dateStr: string, timeStr: string): Promise<boolean>
```

**Contract:**
- Input: dateStr "YYYY-MM-DD", timeStr "HH:MM" — never empty (caller validates)
- Returns: true if found + navigated + filter set. false if not found (alert shown).
- Side effects on success: viewStart/visibleCount updated, isAutoScaled=true, candleFilterMinute set to "YYYY-MM-DDTHH:MM", renderAfterFilterMinute=false, setJumpDate called, setCandleFilterMinute called, setRenderAfterFilterMinute called, drawCanvas called.
- Side effects on failure: window.alert with descriptive message, no state changes.

**Logic:**
1. Get runtime, currentTF, data
2. If !data.length → alert 'Load chart data before adding a backtest section.' → return false
3. dateTimeStr = `${dateStr} ${timeStr}` (space separator to match candle time field)
4. index = getIndexByTime(data, dateTimeStr)
5. If not exact match AND sourceFiles exists → reload CSV, retry
6. If still not exact match → alert `No data found for ${dateStr} at ${timeStr} on the current timeframe.` → return false
7. Navigate: visibleCount clamped, viewStart centered on index, isAutoScaled=true
8. Set filter: filterValue = `${dateStr}T${timeStr}`, runtime.candleFilterMinute=filterValue, runtime.renderAfterFilterMinute=false, call setters, drawCanvas
9. Return true

**IMPORTANT:** Must verify exact match: `data[index].time === dateTimeStr`. getIndexByTime returns closest-left on miss, not -1.

---

## T3: Wire through controller

**File:** `src/hooks/useTradingChartController.ts`

**Changes:**
1. Pass `setCandleFilterMinute` and `setRenderAfterFilterMinute` to `createTradingChartActions` (existing useState setters at lines 63-64)
2. Destructure `addBacktestSection` from result
3. Add `addBacktestSection` to return object

No new state, no new functions, no new imports. Pure pass-through wiring.

---

## T4: Add button + modal to TopBar

**File:** `src/components/TopBar.tsx`

**Props additions:**
```ts
isSectionModalOpen: boolean
onOpenSectionModal: () => void
onCloseSectionModal: () => void
onSubmitSection: (name: string, date: string, time: string) => Promise<boolean>
sectionDefaultName: string
```

**Changes:**
1. Import BacktestSectionModal
2. Destructure new props
3. Add button inside `.toolbar-buttons`: `<button onClick={onOpenSectionModal}>📌 New Section</button>`
4. Wrap return in fragment `<>...</>`, add conditional modal render after `<header>`:
```tsx
{isSectionModalOpen ? (
    <BacktestSectionModal
        defaultName={sectionDefaultName}
        onClose={onCloseSectionModal}
        onSubmit={onSubmitSection}
    />
) : null}
```

---

## T5: Wire state and callbacks in App.tsx

**File:** `src/App.tsx`

**Changes:**
1. Add state: `isSectionModalOpen` (boolean, false), `sectionCounter` (number, 0)
2. Destructure `addBacktestSection` from useTradingChartController
3. Create handler:
```ts
const handleSectionSubmit = async (name: string, date: string, time: string): Promise<boolean> => {
    const success = await addBacktestSection(date, time)
    if (success) setSectionCounter(prev => prev + 1)
    return success
}
```
4. Compute: `sectionDefaultName = \`Section ${sectionCounter + 1}\``
5. Pass 5 new props to `<TopBar>`: isSectionModalOpen, onOpenSectionModal, onCloseSectionModal, onSubmitSection, sectionDefaultName

---

## Edge Cases
- Empty data → alert, modal stays open
- Date exists but time doesn't → alert, modal stays open
- Empty name → uses default ("Section N")
- Empty date/time → alert before submit
- Data reload needed → handled (same pattern as jumpToDate)

---

# Plan: ESC Exit Fullscreen + D Toggle Drawing Mode

## Overview
Add two keyboard shortcuts: ESC exits fullscreen mode (as fallback after existing cancel actions), D toggles drawing mode on/off.

## Task Index

| Task | File | Description |
|------|------|-------------|
| T1 | `src/hooks/useTradingChartWindow.ts` | Extend handleKeyDown with ESC-fullscreen fallback + D-toggle |
| T2 | `src/hooks/useTradingChartController.ts` | Create exitFullscreenRef, wire new deps to bind call |
| T3 | `src/App.tsx` | Set exitFullscreenRef.current on mount |

## Dependency Graph

```
T1 → T2 → T3
```

## Phase Map

- Phase 1: T1
- Phase 2: T2
- Phase 3: T3

---

## T1: Extend handleKeyDown with ESC-fullscreen fallback + D-toggle

**File:** `src/hooks/useTradingChartWindow.ts`

**Type changes — add to `TradingChartWindowDeps`:**
```ts
toggleDrawMode: () => void
exitFullscreenRef: RefObject<(() => void) | null>
```

**Function params:** Add `toggleDrawMode` and `exitFullscreenRef` to destructured params of `bindTradingChartWindowEvents`.

**handleKeyDown ESC block change:**
Replace three standalone ESC `if` blocks with single `if (event.key === 'Escape')` block:
1. Local `escapeHandled: boolean = false`
2. Three inner `if` checks (pendingFibPlacement, pendingEntryPlacement, pendingCandleFilterPick) — each sets `escapeHandled = true`
3. Final `if (!escapeHandled)` calls `exitFullscreenRef.current?.()`

**Add D key handler after ESC block:**
```ts
if ((event.key === 'd' || event.key === 'D') && !event.ctrlKey && !event.altKey && !event.metaKey)
```
→ `event.preventDefault()` then `toggleDrawMode()`

**Input contract:**
- `toggleDrawMode`: from `createTradingChartActions`. Reads refs internally, mount-time capture safe.
- `exitFullscreenRef`: RefObject with `.current` = null or `() => void`. Caller sets before keydown fires.

**Side effects:**
- ESC with active placement: same as current (cancel). No change.
- ESC with no active placement: calls `exitFullscreenRef.current?.()` → exits fullscreen.
- D/d (no modifiers): calls `toggleDrawMode()` → toggles draw mode.
- No side effects when INPUT/TEXTAREA/SELECT focused (existing guard).

---

## T2: Create exitFullscreenRef, wire new deps to bind call

**File:** `src/hooks/useTradingChartController.ts`

**Changes:**
1. After line 48 (existing ref declarations): add `const exitFullscreenRef = useRef<(() => void) | null>(null)`
2. In `useEffect` bind call (lines 249-268): add `toggleDrawMode` and `exitFullscreenRef` to deps object
3. In return object (lines 270-317): add `exitFullscreenRef`

`toggleDrawMode` already in scope from `createTradingChartActions` (line 113).

---

## T3: Set exitFullscreenRef.current in App

**File:** `src/App.tsx`

**Changes:**
1. Destructure `exitFullscreenRef` from `useTradingChartController()` return
2. Add useEffect (empty deps `[]`):
```ts
useEffect(() => {
    exitFullscreenRef.current = () => setIsTopBarVisible(true)
}, [exitFullscreenRef, setIsTopBarVisible])
```

No cleanup needed. `setIsTopBarVisible` is stable React setState.
