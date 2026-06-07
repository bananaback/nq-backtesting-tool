## Focus
Phase 3: Set exitFullscreenRef.current in App

## Phases
- [x] Phase 1: T1 (useTradingChartWindow.ts)
- [x] Phase 2: T2 (useTradingChartController.ts)
- [x] Phase 3: T3 (App.tsx)

## Blockers
None

## Decisions
- ESC uses fallback pattern: cancel placements first, exit fullscreen only if nothing to cancel
- D key requires no modifier keys (Ctrl/Alt/Meta) to avoid browser shortcut conflicts
- exitFullscreenRef pattern needed because fullscreen state lives in App.tsx, outside the hook boundary

## Next
All tasks complete. Synthesize for user.
