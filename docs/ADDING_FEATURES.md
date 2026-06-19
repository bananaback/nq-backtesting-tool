# Adding Features to NQ Auto Backtest Tool

> **Audience:** Human maintainers & AI agents.  
> **Build check:** Always run `npm run build` after any change.

## Where Things Live

```
src/
├── types/chart.ts              ← All TypeScript interfaces (Drawing, Candle, ChartRuntimeState…)
├── constants/chart.ts          ← Config arrays/objects (TIMEFRAMES, DRAW_TOOL_OPTIONS, FIB_TEMPLATES…)
├── utils/                      ← Pure functions, zero side effects
│   ├── math.ts                 ← clamp()
│   ├── time.ts                 ← getTimeframeMinutes, getIndexByTime, formatAxisTime…
│   ├── csv.ts                  ← parseCsvText()
│   └── drawing.ts              ← computeEntryStatus, snapPriceToCandleOHLC, getFibLevelPrice…
├── engine/                     ← Canvas rendering (NO React imports)
│   ├── renderer.ts             ← drawTradingChart() — the main render loop
│   ├── crosshair.ts            ← drawCrosshairOverlay()
│   ├── capture.ts              ← captureChartToImage()
│   └── resize.ts               ← resizeTradingChart()
├── services/                   ← Business logic (NO React, NO canvas)
│   ├── csvService.ts           ← CSV file loading + parsing
│   ├── drawingFactory.ts       ← Drawing creation + gap calculations
│   └── marketAnnotationService.ts ← Auto-generated annotations (VLINE, FIB, FVG…)
├── context/ChartContext.tsx     ← React Context + ChartProvider + useChartContext()
├── hooks/                      ← React hooks (one per concern)
│   ├── useTradingChartController.ts ← The engine hook (provides everything to context)
│   ├── useTradingChartActions.ts    ← Mouse, wheel, drawing, CSV, annotation actions
│   ├── useTradingChartWindow.ts     ← Window event bindings (keyboard, resize)
│   ├── useChartEngine.ts       ← Canvas refs + drawCanvas/resize
│   ├── useChartRuntime.ts      ← useRef objects (runtimeRef, drawModeRef…)
│   └── useAutomation.ts        ← window.__chartAPI exposure
├── components/
│   ├── layout/                 ← Page structure
│   │   ├── AppContent.tsx      ← Layout orchestration (topbar visible/hidden)
│   │   └── TopBar.tsx          ← Toolbar (timeframe, draw, CSV, backtest…)
│   ├── chart/                  ← Chart area
│   │   ├── ChartStage.tsx      ← Canvas layout + overlays
│   │   └── OhlcBox.tsx         ← Crosshair OHLC info box
│   ├── drawing/                ← Drawing tools
│   │   ├── DrawMenu.tsx        ← Tool selection popup
│   │   ├── ObjectsPanel.tsx    ← Drawing list sidebar
│   │   ├── DrawingLengthModal.tsx ← Length editor
│   │   └── FibSetupModal.tsx   ← Fibonacci settings
│   └── modals/                 ← Dialog modals
│       ├── BacktestSectionModal.tsx
│       └── MarketAnnotationsDialog.tsx
└── App.tsx                     ← 10 lines: <ChartProvider><AppContent /></ChartProvider>
```

## Data Flow

```
ChartProvider (context/ChartContext.tsx)
  └─ useTradingChartController()  ← the "engine" hook
       ├─ useRef (runtime state)   ← Canvas-viewport, drawings, mouse
       ├─ useState (React state)   ← Everything sync'd to UI
       └─ creates action functions ← changeTimeframe, createDrawing, etc.
            │
            ▼
     ChartContext.Provider  ← single object with 55+ keys
            │
            ▼
     useChartContext()  ← any component calls this, gets everything
```

**Key rule:** All components read from `useChartContext()`. No prop drilling.

## How to Add…

### …a New State Field

1. Add the field to `ChartRuntimeState` in `types/chart.ts` (if runtime/mutable)
2. Add a `useState` for it in `useTradingChartController.ts`
3. Add it to the `UseTradingChartControllerReturn` interface (same file)
4. Add it to `ChartContextValue` interface in `context/ChartContext.tsx`
5. Add it to the provider's destructure + value object + useMemo deps (same file)
6. Now call `ctx.yourNewField` in any component via `useChartContext()`

### …a New Drawing Tool Type

1. Add the new type to `ToolType` in `types/chart.ts`
2. Define its shape as a new interface (e.g. `MyToolDrawing`) in `types/chart.ts`
3. Add it to the `Drawing` union type in `types/chart.ts`
4. Add the label to `getToolLabel()` in `constants/chart.ts`
5. Add it to `DRAW_TOOL_OPTIONS` array in `constants/chart.ts`
6. Add the creation logic to `createDrawingLogic()` in `services/drawingFactory.ts`
7. Add the rendering logic to `drawTradingChart()` in `engine/renderer.ts`
8. (Optional) Add click-selection logic in `handleMouseUp` in `useTradingChartWindow.ts`

### …a New Button/Control in TopBar

1. Open `components/layout/TopBar.tsx`
2. Call `const ctx = useChartContext()` (already done)
3. Add your JSX button — read state from `ctx.yourState`, call `ctx.yourAction`

### …a New Modal Dialog

1. Create the file in `components/modals/YourModal.tsx`
2. Use `useChartContext()` if you need chart state
3. Import and render it in `AppContent.tsx` (or ChartStage.tsx if it's chart-specific)
4. Add a boolean state to AppContent for open/close

### …New Canvas Rendering

1. Add a helper function to `engine/renderer.ts`
2. Call it from inside `drawTradingChart()` at the right rendering layer
3. Access runtime state from the `runtime` parameter — no React needed

### …a New Service (Business Logic)

1. Create file in `services/yourService.ts`
2. Import types from `types/chart.ts`, utilities from `utils/`
3. Export pure-ish functions that take `runtimeRef` + setters as parameters
4. Call your service from the action functions in `hooks/`

## Component Template

```typescript
import { useChartContext } from '../../context/ChartContext'
// adjust relative path: '../context/ChartContext' for chart/,
// '../../context/ChartContext' for drawing/ or modals/

function YourComponent() {
  const ctx = useChartContext()
  // Now use ctx.currentTF, ctx.drawings, ctx.changeTimeframe(...), etc.
  return <div>{/* your JSX */}</div>
}

export default YourComponent
```

## Verification

```bash
npm run build          # TypeScript + Vite build — must pass
npm run dev            # Dev server for manual testing at http://localhost:5173
```

- `window.__chartAPI` is available in browser console for automation scripts.
- Old API names (`prepareDayView`, `captureChartAsBlob`, `getAllDates`) still work.
- New cleaner names (`prepareDay`, `captureChart`, `getAvailableDates`) are aliases.
