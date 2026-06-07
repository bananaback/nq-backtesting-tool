# AGENTS.md — Agent Team Operating Manual

## Agent Hierarchy

```
manager (primary) ← user interacts here
  |-- explorer   codebase navigation
  |-- planner    interface contracts, dependency graph
  |-- coder      backend implementation + reviewer loop
  |-- ui         frontend implementation + reviewer loop
  +-- reviewer   contract compliance verification (called by coder/ui only)
```

## Model & Role Assignment

| Agent    | Model            | Role |
|----------|------------------|------|
| manager  | qwen3.7-plus     | Phased orchestration, delegation, state, synthesis |
| planner  | qwen3.7-plus     | Interface contracts, dependency graph, writes PLAN.md |
| coder    | deepseek-v4-flash | Backend implementation, reviewer loop, report |
| reviewer | deepseek-v4-pro  | Contract compliance check, called by coder/ui only |
| ui       | kimi             | Frontend implementation, reviewer loop, report |
| explorer | deepseek-v4-flash | File discovery — paths and line numbers only |

## Standard Workflow

```
explorer finds files
  → planner writes PLAN.md (contracts + dependency graph)
    → manager derives phase map → writes to WORKING_STATE.md
      → for each phase:
           dispatch coder(s) with their contract block
           coder implements → calls reviewer → fix loop (max 3 cycles) → reports
           manager marks phase done → advances to next phase
    → manager synthesizes → responds to user
```

1. **Locate** — `explorer` finds relevant files and line numbers, returns to manager
2. **Design** — `planner` produces interface contracts and dependency graph, writes full output to `PLAN.md`
3. **Phase** — `manager` reads dependency graph from `PLAN.md`, derives ordered phases, writes phase map to `WORKING_STATE.md`
4. **Execute** — `manager` dispatches one phase at a time; each coder receives only its own contract block
5. **Review** — coder calls `reviewer` after implementing, fixes on NEEDS FIXES, max 3 cycles
6. **Synthesize** — manager collects reports, responds to user in 1–3 sentences

Skip `explorer` and `planner` only for: single-line typo fix, pure comment change.

## State Files

| File | Owner | Purpose |
|------|-------|---------|
| `PLAN.md` | planner writes, manager reads | Full contracts and dependency graph. Append amendments only — never overwrite. |
| `WORKING_STATE.md` | manager writes | Current phase, task status, blockers, decisions |

## Agent Permissions

```json
[
  {"agent":"manager",  "can":["read","glob","grep","list","task","todowrite","question","webfetch","websearch","skill"],"cannot":["edit","bash"]},
  {"agent":"planner",  "can":["read","glob","grep","list","task","webfetch","websearch","external_directory","skill"],"cannot":["edit","bash","todowrite","question"]},
  {"agent":"coder",    "can":["read","glob","grep","list","edit","bash","task","todowrite","question","external_directory","skill"],"cannot":["webfetch","websearch"]},
  {"agent":"reviewer", "can":["read","glob","grep","list","task","webfetch","external_directory","skill"],"cannot":["edit","bash","todowrite","question","websearch"]},
  {"agent":"ui",       "can":["read","glob","grep","list","edit","bash","task","todowrite","question","webfetch","websearch","external_directory","skill"],"cannot":[]},
  {"agent":"explorer", "can":["read","glob","grep","list","task","webfetch","websearch","external_directory"],"cannot":["edit","bash","todowrite","question","skill"]}
]
```

## Role Boundaries

### Manager
- Owns sequencing, state, and synthesis. Never designs, plans, codes, or edits files.
- Reads `PLAN.md` from disk — does not hold the plan in context after writing it.
- Derives phase map from the dependency graph before dispatching any task.
- Dispatches one phase at a time. Waits for all tasks in a phase to complete before advancing.
- Passes only the relevant contract block to each coder — never the full plan.
- Never calls `reviewer` directly — review is coder's responsibility.
- On blocker after 3 coder cycles: re-engages planner for that task only, appends amendment to `PLAN.md`.

### Planner
- **Produces**: interface contracts (signatures, input/output constraints, side effects), dependency graph, task index, edge cases, risks — written to `PLAN.md`.
- **Does not produce**: pseudocode, local variable names, algorithm strategy, implementation steps, or any code a coder could paste directly into a file.
- Contract defines the boundary. Implementation is the coder's domain.

### Coder / UI
- Receives one contract block. Owns all internal implementation decisions: variable names, data structures, algorithm choice.
- Reads surrounding code before editing. Matches existing style. Touches only what the contract requires.
- Applies Code Standards to every function, method, and class written or modified: Google-style docstring and full type annotations on all parameters and return values.
- Validates with lint/tests before calling reviewer.
- Calls reviewer after every implementation and after every fix — no exceptions.
- Fix loop: max 3 reviewer cycles. Unresolved CRITICAL or WARN after 3 → escalate to manager.
- Never self-declares PASS. Only `Verdict: PASS` from the reviewer closes the task.

### Reviewer
- Called by coder or ui — never by manager.
- Reviews only the file:line range provided (±10 lines context).
- Verifies: signature match, input constraints enforced, output contracts satisfied, side effects correct, no out-of-scope changes.
- Does not check internal variable names, algorithm choice, or code style beyond behavioral impact.
- Hard cap: 5 findings. More than 5 means scope has drifted — narrow the focus.
- Severity: CRITICAL (contract violation, broken behavior) / WARN (likely bug) / INFO (style with behavioral impact only).
- PASS requires zero CRITICAL and zero WARN. INFO alone does not block.

### Explorer
- Returns file paths and line numbers only. One-line descriptions where helpful.
- Never interprets findings — flags when deeper analysis is needed: "planner should analyze this."
- Never runs the application.

## Code Standards

These apply to every function, method, and class written or modified by any agent. The reviewer enforces them.

### Docstrings

Every public function, method, and class must have a docstring. Use Google style.

```python
def function_name(param1: int, param2: str) -> bool:
    """One-line summary of what this does.

    Args:
        param1: What this value represents and any constraints.
        param2: What this value represents and any constraints.

    Returns:
        What the return value represents.

    Raises:
        ValueError: Condition that triggers this error.
        KeyError: Condition that triggers this error.
    """
```

- Private helpers (`_name`) must have a docstring if the logic is non-obvious.
- Omit `Args` / `Returns` / `Raises` sections only when the function is a trivial one-liner with a self-explanatory signature.

### Strong Typing

Every parameter and return value must be annotated. No exceptions.

| Rule | Correct | Wrong |
|------|---------|-------|
| Always annotate return type | `-> None` | missing `->` |
| Use generic collections | `list[str]` | `list`, `List` |
| Use generic mappings | `dict[str, int]` | `dict`, `Dict` |
| Nullable params | `str \| None` | `str` with a None default |
| Fixed value sets | `Literal["a", "b"]` | `str` |
| Avoid Any | only with `# type: ignore` and a comment | bare `Any` |

Missing annotation on any parameter or return type is a WARN finding. Use of bare `Any` without justification is a WARN finding.

## Token Optimization

- `explorer` is cheapest — use it for all file discovery instead of planner or coder.
- Manager receives summaries from subagents — never raw tool output.
- Manager reads `PLAN.md` from disk rather than holding it in context.
- Each coder receives only its own contract block, not the full plan.
- `WORKING_STATE.md` is the source of truth for phase progress — not conversation history.
- Flash agents run at `temperature: 0.1` to reduce variance.

## Review Hotspots

<!-- Add project-specific hotspots here.
| Area | Concern |
|------|---------|
| WebSocket streaming | Stateful protocol — violations cause client/server desyncs |
| Database migrations | Must be reversible — check down() methods |
-->

## WORKING_STATE.md Schema

```markdown
## Focus
[current phase and goal in one sentence]

## Phases
- [x] Phase 1 (parallel): T1, T2
- [ ] Phase 2 (sequential): T3
- [ ] Phase 3 (parallel): T4, T5

## Blockers
[task ID and description, or "None"]

## Decisions
- [decision]: [rationale]

## Next
[next action]
```