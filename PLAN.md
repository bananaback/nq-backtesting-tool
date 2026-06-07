# Plan: Round Input Time to Nearest Candle for Non-1m Timeframes

### Analysis

**Problem:** `addBacktestSection` in `useTradingChartActions.ts` searches for a candle by exact time string match (`t.includes(time)` at line 197). User provides `"09:32"` via the modal. For m1, every minute has a candle — match found. For m5/m15/h1, candles only exist at aligned intervals (09:30/09:35 for m5, 09:30/09:45 for m15, 09:00/10:00 for h1). No candle contains `"09:32"` → search returns -1 → alert "No data found" → navigation fails.

**Scope:** Two files. `src/chartUtils.ts` gets a new pure utility function. `src/hooks/useTradingChartActions.ts` calls it before searching.

**Constraints:**
- Must not change behavior for m1 (every minute is valid, floor is identity).
- `candleFilterMinute` must use the rounded time so the render filter cutoff matches the actual candle found.
- No new npm dependencies. Pure arithmetic.
- Existing `getTimeframeMinutes` already maps tf→interval — reuse it.

---

### Task Index

```
T1: Add roundTimeToTimeframe() utility — src/chartUtils.ts
T2: Use rounded time in addBacktestSection — src/hooks/useTradingChartActions.ts
```

---

### Dependency Graph

```
T1 -> T2
```

### Execution Levels

```
Level 0: T1
Level 1 (after Level 0): T2
```

---

### Contracts

#### T1: Add roundTimeToTimeframe utility

**Location**
- File: `src/chartUtils.ts`
- Insert after line 181 (after `getTimeframeMinutes` function, before `getDrawingLengthMinutes`)

**Signature**
```ts
export function roundTimeToTimeframe(timeStr: string, tf: Timeframe): string
```

**Input contract**
| Parameter | Constraint |
|-----------|------------|
| `timeStr` | Must be `"HH:MM"` 24-hour format (e.g. `"09:32"`, `"14:00"`, `"00:00"`). Hours 00–23, minutes 00–59. No seconds. |
| `tf` | Must be a valid `Timeframe` value: `'m1'`, `'m5'`, `'m15'`, `'h1'`. |

**Output contract**
- Returns: `string` in `"HH:MM"` format — the input time floored to the nearest multiple of the timeframe's interval in minutes since midnight.
  - m1 (interval 1): identity — returns `timeStr` unchanged.
  - m5 (interval 5): `"09:32"` → `"09:30"`, `"09:37"` → `"09:35"`, `"10:14"` → `"10:10"`.
  - m15 (interval 15): `"09:32"` → `"09:30"`, `"09:47"` → `"09:45"`, `"10:05"` → `"10:00"`.
  - h1 (interval 60): `"09:32"` → `"09:00"`, `"14:59"` → `"14:00"`, `"00:00"` → `"00:00"`.
- Raises: never. Input is assumed valid per contract.

**Side effects**
- None. Pure function.

**Dependencies**
- Calls: `getTimeframeMinutes(tf)` from same file — to get interval in minutes.

**Task dependencies:** []

---

#### T2: Use rounded time in addBacktestSection

**Location**
- File: `src/hooks/useTradingChartActions.ts`
- Modify existing file: import line 3, and lines 202–222 inside `addBacktestSection`

**Signature — import change (line 3)**

Replace:
```ts
import { clamp, getFirstIndexByDate, getIndexByTime, getPreviousDateString, parseCsvText } from '../chartUtils'
```
With:
```ts
import { clamp, getFirstIndexByDate, getIndexByTime, getPreviousDateString, parseCsvText, roundTimeToTimeframe } from '../chartUtils'
```

**Behavioral changes inside `addBacktestSection` (lines 177–231)**

After line 185 (the early return for empty data) and before line 187 (the `findIndexByDateAndTime` declaration), add:
```ts
const roundedTimeStr = roundTimeToTimeframe(timeStr, currentTF)
```

Then replace all occurrences of `timeStr` used for candle searching and filter value with `roundedTimeStr`:
- Line 202: `findIndexByDateAndTime(data, dateStr, timeStr)` → `findIndexByDateAndTime(data, dateStr, roundedTimeStr)`
- Line 209: `findIndexByDateAndTime(data, dateStr, timeStr)` → `findIndexByDateAndTime(data, dateStr, roundedTimeStr)`
- Line 222: `const filterValue = \`${dateStr}T${timeStr}\`` → `const filterValue = \`${dateStr}T${roundedTimeStr}\``

The alert message on line 213 should also use `roundedTimeStr` instead of `timeStr`:
- Line 213: `` `No data found for ${dateStr} at ${timeStr} on the current timeframe.` `` → `` `No data found for ${dateStr} at ${roundedTimeStr} on the current timeframe.` ``

**Task dependencies:** [T1]
