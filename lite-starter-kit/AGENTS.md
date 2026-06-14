# AGENTS.md — Agent Team Operating Manual

## Hierarchy
manager (primary) ← user interacts here
|-- planner   clarify, explore, design, write PLAN.md (collaborative with user)
|-- explorer  cheap "where is X" lookups — paths + line ranges only
|-- coder     backend impl, self-validates (cheap model — needs literal contracts)
+-- ui        frontend impl, self-validates

## Models

| Agent | Model | Notes |
|---|---|---|
| manager | minimax-m3 | orchestration only |
| planner | minimax-m3 | collaborative w/ user |
| explorer | deepseek-v4-flash | locations only, no analysis |
| coder | deepseek-v4-flash | literal contract execution |
| ui | kimi-k2.6 | frontend |

## Pipeline

1. `planner` clarifies → explores → collaborates → writes `PLAN.md` (after approval).
2. `manager` derives phase map from `PLAN.md`'s dependency graph → writes `WORKING_STATE.md`.
3. `manager` dispatches one phase at a time; each `coder`/`ui` gets only its own contract block.
4. `manager` synthesizes reports → responds to user (1-3 sentences).

**Routing:** trivial (single-line fix, comment-only edit, one unambiguous change) → manager writes an inline contract → `coder`/`ui` directly, skipping `planner`. Everything else goes through `planner`.

## State Files

| File | Owner | Purpose |
|---|---|---|
| `PLAN.md` | planner writes (post-approval), manager reads | Analysis, task index, dependency graph, contracts. Amendments appended under `### Amendments` only — never edit originals. |
| `WORKING_STATE.md` | manager writes | Current phase, task status, blockers, decisions |

On a coder/ui escalation, `manager` re-dispatches `planner` for that task alone; `planner` appends an amendment to `PLAN.md`.

## Review Hotspots

## WORKING_STATE.md Schema

```markdown
## Focus
[current phase and goal, one sentence]

## Phases
- [x] Phase 1 (parallel): T1, T2
- [ ] Phase 2 (sequential): T3

## Blockers
[task ID + description, or "None"]

## Decisions
- [decision]: [rationale]

## Next
[next action]
```