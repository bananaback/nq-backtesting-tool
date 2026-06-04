# AGENTS.md -- Agent Team Operating Manual
## Agent Hierarchy
```
manager (primary) <- user interacts with this
  |-- planner    -- architecture & design, dependency graph
  |-- coder      -- backend implementation + self-review loop (calls reviewer)
  |-- ui         -- frontend implementation + self-review loop (calls reviewer)
  +-- explorer   -- codebase navigation
```
## Model & Role Assignment
|Agent|Model|Role|
|-|-|-|
|manager|Mimo|Routing, delegation, synthesis|
|planner|GLM|System design, interfaces, file change maps|
|coder|Deepseek Flash|Implement, self-review loop with reviewer, report|
|reviewer|Deepseek V4 Pro|Incremental per-task review, called by coder|
|ui|Kimi|Frontend, styling, UX|
|explorer|Deepseek Flash|Search, grep, glob, read -- cheapest|
## Standard Workflow
```
explorer -> planner (detailed plan + dependency graph)
  -> manager decomposes into task groups (parallel vs sequential)
  -> for each task group:
       coder implements -> calls reviewer -> fix loop (max 3 cycles) -> report
  -> manager synthesizes
```
1. **Locate** -- `explorer` finds relevant files and line numbers
2. **Design** -- `planner` produces structured plan with contracts, dependency graph, and task IDs
3. **Decompose** -- `manager` reads dependency graph, groups independent tasks for parallel execution, dispatches coders
4. **Implement + Review** -- each `coder` implements, calls `reviewer` on changes, fixes until clean or max 3 cycles
5. **Synthesize** -- `manager` collects coder reports, responds to user
Skip planner only for: single-line typo fix, pure comment change.
## Agent Permissions
```json
[
  {"agent":"manager","can":["read","glob","grep","list","task","todowrite","question","webfetch","websearch","skill"],"cannot":["edit","bash"]},
  {"agent":"planner","can":["read","glob","grep","list","task","webfetch","websearch","external_directory","skill"],"cannot":["edit","bash","todowrite","question"]},
  {"agent":"coder","can":["read","glob","grep","list","edit","bash","task","todowrite","question","external_directory","skill"],"cannot":["webfetch","websearch"]},
  {"agent":"reviewer","can":["read","glob","grep","list","task","webfetch","external_directory","skill"],"cannot":["edit","bash","todowrite","question","websearch"]},
  {"agent":"ui","can":["read","glob","grep","list","edit","bash","task","todowrite","question","webfetch","websearch","external_directory","skill"],"cannot":[]},
  {"agent":"explorer","can":["read","glob","grep","list","task","webfetch","websearch","external_directory"],"cannot":["edit","bash","todowrite","question","skill"]}
]
```
## Role Boundaries
### Manager
- Delegates everything. Never plans, never codes, never edits.
- Routing: design -> planner / backend -> coder / frontend -> ui / search -> explorer
- Task decomposition: reads planner dependency graph, identifies parallel vs sequential groups
- Never calls reviewer directly; review is coder's responsibility
- Keeps context lean: receives summaries, not raw tool output
- Maintains WORKING_STATE.md after each significant step
### Planner
- **Produces**: function signatures, class structures, pseudocode, file change maps, data flow, edge case analysis
- **Does not produce**: function bodies, copy-pasteable code, line-by-line edits, boilerplate
- Self-check: if coder can paste your output directly into a file, you wrote code, not a plan
### Coder / UI
- Follows the plan exactly -- no redesign
- Calls reviewer before implementing if approach is uncertain (pre-implementation check)
- After implementing each task, calls reviewer via `task` tool with subagent_type "reviewer"
- Fix loop: max 3 review cycles. If still failing after 3, report blocker to manager.
- Asks via `question` if genuinely unclear, never guesses
- Validates (lint/tests) before reporting
- Reports: changed files with line ranges, review result, blockers
### Reviewer
- Called by coder (not manager) for incremental per-task review
- Reviews **only** the file:line ranges provided -- +/-10 lines context max
- Receives task context: what was implemented, which plan step, what to verify
- Hard cap: **5 findings**. More than 5 means scope has drifted.
- Severity: CRITICAL (breaks/security/plan violation) / WARN (potential bug) / INFO (behavior-changing style only)
- No praise, no preamble, no architecture commentary
### Explorer
- Returns file paths, line numbers, 1-line descriptions -- nothing more
- Uses bash for `grep`/`find`/`cat` only -- never runs the application
- Flags when deeper analysis is needed: "planner can analyze this further"
## Token Optimization
- Explorer is cheapest -- use it for all search/navigation instead of planner or coder
- Manager receives summaries only, never raw subagent output
- WORKING_STATE.md replaces long conversation replay for state tracking
- `tool_output.max_lines: 100` prevents subagent output from flooding manager context
- `compaction.tail_turns: 10` with `auto: true` keeps context manageable
- Flash agents run at `temperature: 0.1` to reduce variance
## Review Hotspots
<!-- Add project-specific review hotspots here. Examples:
|Area|Concern|
|-|-|
|WebSocket streaming|Stateful protocol -- violations cause client/server desyncs|
|Database migrations|Must be reversible -- check down() methods|
-->
## WORKING_STATE.md Schema
```
## Focus
[current task in 1 sentence]
## Active Tasks
- [ ] pending
- [x] done
## Blockers
[anything preventing progress, or "None"]
## Decisions
- [decision]: [rationale]
## Next
[immediate next step]
```
