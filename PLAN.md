# PLAN.md — Remove Snap-to-OHLC from Entry Tool

## Analysis

**Problem:** Entry placement wizard snaps user's clicked price to nearest OHLC value (open/high/low/close) of the hovered candle. Client wants free price selection — click anywhere on Y-axis, get that exact price for entry, SL, and TP.

**Scope:** 2 files, 6 call sites modified. `snapPriceToCandleOHLC` function definition and Fib tool usages remain untouched.

**Constraints:**
- Fib tool keeps snap behavior (out of scope)
- 4-click entry wizard flow unchanged (entry → SL → TP → width)
- All validation logic unchanged (SL ≠ entry, LONG TP > entry, SHORT TP < entry)
- Entry status computation unchanged
- No new dependencies

**Unknowns:** None.

---

## Task Index

```
T1: Replace snappedPrice with cursorPrice in entry wizard clicks — src/hooks/useTradingChartWindow.ts
T2: Replace snap calls with cursorPrice in entry render previews — src/chartRender.ts
```

---

## Dependency Graph

```
(no dependencies — T1 and T2 are independent)
```

### Execution Levels

```
Level 0 (parallel): T1, T2
```

---

## Contracts

---

#### T1: Remove snap from entry wizard click handlers

**Location**
- File: `src/hooks/useTradingChartWindow.ts`
- Modify lines 248, 257, 274 (3 substitutions)

**What to change**

In the `mouseup` handler's `pendingEntryPlacement` block, replace `snappedPrice` with `cursorPrice` at three locations:

1. **Line 248** — Click 1 (entry point):
   ```
   // Before:
   firstPoint: { time: candle.time, price: snappedPrice },
   // After:
   firstPoint: { time: candle.time, price: cursorPrice },
   ```

2. **Line 257** — Click 2 (stop loss):
   ```
   // Before:
   const stopLossPrice = snappedPrice
   // After:
   const stopLossPrice = cursorPrice
   ```

3. **Line 274** — Click 3 (take profit):
   ```
   // Before:
   const takeProfitPrice = snappedPrice
   // After:
   const takeProfitPrice = cursorPrice
   ```

**What NOT to change**
- Line 195: `const snappedPrice = snapPriceToCandleOHLC(candle, cursorPrice)` — keep, still used by Fib at line 207
- Line 248 Fib path (line 207): `price2: snappedPrice` — keep
- Import of `snapPriceToCandleOHLC` on line 3 — keep, still used at line 195
- All validation logic (lines 258-261, 276-283) — keep unchanged
- Click 4 (width, lines 292-328) — no snap used here, no changes needed

**Side effects:** None beyond behavioral change — entry/SL/TP prices now reflect exact Y-axis click position instead of nearest OHLC.

**Task dependencies:** []

---

#### T2: Remove snap from entry render previews

**Location**
- File: `src/chartRender.ts`
- Modify lines 869, 913, 1005 (3 substitutions)

**What to change**

In the pending entry placement render section, replace `snapPriceToCandleOHLC(hoverCandle, cursorPrice)` with `cursorPrice`:

1. **Line 869** — Phase 1 preview (entry dot):
   ```
   // Before:
   const firstPrice = snapPriceToCandleOHLC(hoverCandle, cursorPrice)
   // After:
   const firstPrice = cursorPrice
   ```

2. **Line 913** — Phase 2 preview (SL line + dot):
   ```
   // Before:
   const slPrice = snapPriceToCandleOHLC(hoverCandle, cursorPrice)
   // After:
   const slPrice = cursorPrice
   ```

3. **Line 1005** — Phase 3 preview (TP line + dot):
   ```
   // Before:
   const tpPrice = snapPriceToCandleOHLC(hoverCandle, cursorPrice)
   // After:
   const tpPrice = cursorPrice
   ```

**What NOT to change**
- Line 796: `const firstPrice = snapPriceToCandleOHLC(hoverCandle, cursorPrice)` — Fib preview, keep
- Line 826: `const secondPrice = snapPriceToCandleOHLC(hoverCandle, cursorPrice)` — Fib preview, keep
- Import of `snapPriceToCandleOHLC` on line 3 — keep, still used by Fib at lines 796 and 826
- All drawing logic (ctx.beginPath, arc, moveTo, lineTo, stroke) — unchanged, just receives different price values

**Side effects:** None beyond visual change — preview dots/lines now track exact cursor Y position instead of snapping to OHLC.

**Task dependencies:** []

---

## Edge Cases

- `cursorPrice` equals `entryPrice` on SL click → handled by existing validation at line 258-261 (`window.alert('Stop loss cannot equal entry price.')`)
- `cursorPrice` on wrong side of entry for TP → handled by existing validation at lines 276-283
- `cursorPrice` outside visible price range → cannot happen; `cursorPrice` computed from `manualMaxP`, `manualMinP`, and canvas Y coordinate (line 194), always within visible range
- Very small price differences (floating point) → no issue; prices stored as `number`, rendering uses `getY()` which handles arbitrary floats

---

## New Dependencies

None.

---

## Risks

- **Risk:** User places entry at price far from any OHLC value, making visual placement feel disconnected from candles — **Mitigation:** This is the desired behavior per client request. Preview dots/lines still render at exact click position, providing clear visual feedback.
