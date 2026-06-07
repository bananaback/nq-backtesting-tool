## Focus
All phases complete

## Phases
- [x] Phase 1: T1 (src/chartCapture.ts — already exists)
- [x] Phase 2: T2 (src/hooks/useTradingChartWindow.ts — P key handler)
- [x] Phase 3: T3 (src/hooks/useTradingChartController.ts — wire refs)

## Blockers
None

## Decisions
- All tasks sequential (T1 → T2 → T3) since each depends on previous
- No new npm dependencies — use browser-native toBlob + anchor download pattern
- P key requires no modifier keys (consistent with D key pattern, avoids Ctrl+P conflict)

## Next
Done
