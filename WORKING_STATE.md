## Focus
All phases complete

## Phases
- [x] Phase 1: T1 (src/chartUtils.ts — new utility function)
- [x] Phase 2: T2 (src/hooks/useTradingChartActions.ts — use rounded time)

## Blockers
None

## Decisions
- Two sequential phases (T1 → T2) since T2 depends on T1
- Floor operation (not round) — snaps down to nearest valid candle time
- No validation in utility — browser enforces HH:MM format via input type="time"

## Next
Synthesize and report to user
