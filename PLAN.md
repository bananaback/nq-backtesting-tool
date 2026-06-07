# Plan: Press P to Capture Screen

## Analysis

**Problem:** No screenshot/export capability exists. Users cannot save the current chart view as an image. The chart is split across three separate `<canvas>` elements (chart, y-axis, x-axis) that must be composited into a single image for a meaningful capture.

**Scope:** New utility file `src/chartCapture.ts`, keyboard handler extension in `src/hooks/useTradingChartWindow.ts`, wiring in `src/hooks/useTradingChartController.ts`.

**Constraints:**
- Three canvases must be composited: chart (main area) + y-axis (right, 80px) + x-axis (bottom, 24px), per dimensions in `chartResize.ts`.
- P key must follow existing D key pattern: no modifier keys (Ctrl/Alt/Meta) to avoid conflict with Ctrl+P (browser print).
- Canvas refs live in `useTradingChartController`; keyboard handler lives in `useTradingChartWindow`. Currently only `chartCanvasRef` is passed to the window handler — `yAxisCanvasRef` and `xAxisCanvasRef` must be added to the deps.
- No new npm dependencies. Browser-native `HTMLCanvasElement.toBlob()` and temporary `<a>` download pattern.

---

## Task Index

```
T1: Create chart capture utility — src/chartCapture.ts (new file)
T2: Add P key handler + canvas ref deps — src/hooks/useTradingChartWindow.ts
T3: Pass yAxisCanvasRef and xAxisCanvasRef to bind call — src/hooks/useTradingChartController.ts
```

---

## Dependency Graph

```
T1 → T2 → T3
```

## Execution Levels

```
Level 0: T1
Level 1: T2
Level 2: T3
```

---

## Contracts

#### T1: Create chart capture utility

**Location**
- File: `src/chartCapture.ts`
- New file

**Signature**
```ts
function captureChartToImage(chartCanvas: HTMLCanvasElement, yAxisCanvas: HTMLCanvasElement, xAxisCanvas: HTMLCanvasElement): void
```

**Input contract**
| Parameter | Constraint |
|-----------|------------|
| `chartCanvas` | Mounted canvas with `.width > 0` and `.height > 0`. Must have rendered content. |
| `yAxisCanvas` | Mounted canvas with `.width > 0` and `.height > 0`. Must have rendered content. |
| `xAxisCanvas` | Mounted canvas with `.width > 0` and `.height > 0`. Must have rendered content. |

**Output contract**
- Returns: `void`
- Raises: never (all errors silently ignored — capture is best-effort)

**Side effects**
- Creates an offscreen `<canvas>` element (not added to DOM) with dimensions: `width = chartCanvas.width + yAxisCanvas.width`, `height = chartCanvas.height + xAxisCanvas.height`.
- Draws `chartCanvas` at position `(0, 0)` on the offscreen canvas.
- Draws `yAxisCanvas` at position `(chartCanvas.width, 0)` on the offscreen canvas.
- Draws `xAxisCanvas` at position `(0, chartCanvas.height)` on the offscreen canvas.
- Calls `offscreenCanvas.toBlob()` with `"image/png"` format.
- On blob success: creates a temporary `HTMLAnchorElement` with `download` attribute set to `chart-capture-YYYYMMDD-HHmmss.png` (timestamp from `new Date()` at moment of capture). Appends anchor to `document.body`, calls `.click()`, removes anchor from DOM, revokes the object URL via `URL.revokeObjectURL()`.
- On blob failure (null blob): no-op.

**Task dependencies:** []

---

#### T2: Add P key handler + canvas ref deps

**Location**
- File: `src/hooks/useTradingChartWindow.ts`
- Modify existing file

**Signature — type changes**

Add two fields to `TradingChartWindowDeps` (line 5–26):
```ts
yAxisCanvasRef: RefObject<HTMLCanvasElement | null>
xAxisCanvasRef: RefObject<HTMLCanvasElement | null>
```

Add both to the destructured parameter of `bindTradingChartWindowEvents` (line 59–80).

**Signature — import addition**

Add at top of file (after existing imports):
```ts
import { captureChartToImage } from '../chartCapture'
```

**Signature — handleKeyDown addition**

Add new `if` block inside `handleKeyDown` (after the existing D key block, before the closing `}` of the function, around line 521):

```ts
if ((event.key === 'p' || event.key === 'P') && !event.ctrlKey && !event.altKey && !event.metaKey) {
    event.preventDefault()
    const chartCanvas = chartCanvasRef.current
    const yAxisCanvas = yAxisCanvasRef.current
    const xAxisCanvas = xAxisCanvasRef.current
    if (chartCanvas && yAxisCanvas && xAxisCanvas) {
        captureChartToImage(chartCanvas, yAxisCanvas, xAxisCanvas)
    }
}
```

**Task dependencies:** [T1]

---

#### T3: Pass yAxisCanvasRef and xAxisCanvasRef to bind call

**Location**
- File: `src/hooks/useTradingChartController.ts`
- Modify existing file, lines 311–332

**Signature — no type or function signature changes**

Add two fields to the `bindTradingChartWindowEvents` call object (inside the `useEffect` at line 311):
```ts
yAxisCanvasRef,
xAxisCanvasRef,
```

These are existing local variables (declared at lines 73–74), already in scope. No new imports, no new state, no new refs.

**Task dependencies:** [T2]
