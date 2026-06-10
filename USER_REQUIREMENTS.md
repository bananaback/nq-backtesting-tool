# User Requirements

## Original Request
Add a new drawing tool that when clicked, automatically adds to the object list:
1. Every 30 minutes draw a vertical line, just from 7:00 to 11:00
2. x:00 - x:30 is premarket range, draw horizontal line of high and low and extend right until it breaks by a candle
3. x:30 - x+1:00 is opening range, draw fibonacci with 4 quadrant levels for that

## Refined Requirements

### Scope
- **New drawing tool** added to the chart toolbar that generates multiple annotation objects in one action
- **Activation flow**: User clicks tool → date picker dialog appears → user selects a date → all annotations for that date are drawn and added to the chart's object list
- **Annotation window**: 7:00 to 11:00 (chart time, no timezone conversion)
- **9 vertical time-marker lines**: drawn at every :00 and :30 mark (7:00, 7:30, 8:00, 8:30, 9:00, 9:30, 10:00, 10:30, 11:00), each spanning full chart height (Y-axis)
- **Repeating 30-min alternating pattern** from 7:00 to 11:00:
  - **x:00–x:30 "Premarket Range"** (7:00–7:30, 8:00–8:30, 9:00–9:30, 10:00–10:30):
    - Calculate high and low from all candle prices within that 30-min window
    - Draw horizontal line at the high, extend right until a candle WICK (high or low) touches/exceeds the level
    - Draw horizontal line at the low, extend right until a candle WICK (high or low) touches/exceeds the level
    - Line stops at the break candle (does not extend past it)
    - If no wick break occurs, line extends to 11:00 only (then stops)
  - **x:30–x+1:00 "Opening Range"** (7:30–8:00, 8:30–9:00, 9:30–10:00, 10:30–11:00):
    - Calculate high and low from all candle prices within that 30-min window
    - Draw Fibonacci retracement anchored from window start time to window end time (e.g., 7:30 to 8:00)
    - Fibonacci levels: 0%, 25%, 50%, 75%, 100%
    - Level lines stay within the anchor time window only (do not extend beyond)
- **All generated objects** (vertical lines, horizontal lines, Fibonacci retracements) are automatically added to the chart's drawing object list

### Constraints
- Times are interpreted using chart/bar time as-is — no timezone conversion applied
- Break detection uses candle WICK (high/low), not candle close
- Fibonacci anchor points are the start and end of each opening-range time window (not the full session)
- Horizontal premarket lines are capped at 11:00 maximum extent (even if unbroken)

### Preferences
- Date picker UI for selecting which trading day to annotate
- Each 30-min block is labeled/categorized as either "premarket range" or "opening range" based on its position in the alternating pattern

### Edge Cases
- **No candle data in a 30-min window** (data gap, holiday): show a visible missing-data marker for that window instead of drawing annotations
- **No wick break occurs** for a premarket high/low: horizontal line extends to 11:00 and stops
- **Partial data in window**: calculate high/low from whatever candles exist within the 30-min window
- **Date with no data at all**: date picker should still allow selection; tool should indicate no data available (via missing-data markers or a dialog)

### Out of Scope
- Timezone conversion or time offset settings
- Multi-day batch drawing (user selects one date at a time)
- Modifying or deleting individual annotations after creation (handled by existing chart object management)
- Customization of time windows, level percentages, or annotation window (7:00–11:00) via UI settings
