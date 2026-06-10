# AGENTS.md — Agent Team Operating Manual

## Agent Hierarchy

```
manager (primary) ← user interacts here
  |-- requirements_collector   requirement clarification via structured questions
  |-- explorer                 codebase navigation
  |-- planner                  interface contracts, dependency graph (collaborative with user)
  |-- coder                    backend implementation + reviewer loop
  |-- ui                       frontend implementation + reviewer loop
  +-- reviewer                 contract compliance verification (called by coder/ui only)
```

## Model & Role Assignment

| Agent                  | Model             | Role |
|------------------------|-------------------|------|
| manager                | qwen3.7-plus      | Phased orchestration, delegation, state, synthesis |
| requirements_collector | qwen3.7-plus      | Requirement clarification via structured questions, writes USER_REQUIREMENTS.md |
| planner                | qwen3.7-plus      | Interface contracts, dependency graph, collaborative planning with user |
| coder                  | deepseek-v4-flash | Backend implementation, reviewer loop, report |
| reviewer               | deepseek-v4-pro   | Contract compliance check, called by coder/ui only |
| ui                     | kimi              | Frontend implementation, reviewer loop, report |
| explorer               | deepseek-v4-flash | File discovery — paths and line numbers only |

## Standard Workflow

```
requirements_collector clarifies ambiguous requests → writes USER_REQUIREMENTS.md
  → explorer finds files
    → planner collaborates with user → writes PLAN.md (contracts + dependency graph)
      → manager derives phase map → writes to WORKING_STATE.md
        → for each phase:
             dispatch coder(s) with their contract block
             coder implements → calls reviewer → fix loop (max 3 cycles) → reports
             manager marks phase done → advances to next phase
      → manager synthesizes → responds to user
```

0. **Clarify** — `requirements_collector` resolves ambiguities via structured questions, writes `USER_REQUIREMENTS.md` (skip when request is already clear)
1. **Locate** — `explorer` finds relevant files and line numbers, returns to manager
2. **Design** — `planner` collaborates with user on design decisions, produces interface contracts and dependency graph, writes final output to `PLAN.md`
3. **Phase** — `manager` reads dependency graph from `PLAN.md`, derives ordered phases, writes phase map to `WORKING_STATE.md`
4. **Execute** — `manager` dispatches one phase at a time; each coder receives only its own contract block
5. **Review** — coder calls `reviewer` after implementing, fixes on NEEDS FIXES, max 3 cycles
6. **Synthesize** — manager collects reports, responds to user in 1–3 sentences

**Routing rules:**
- Requirements are ambiguous or vague → Step 0 (requirements_collector) → Step 1 (explorer) → Step 2 (planner) → Step 4 (coder/ui)
- Requirements are clear and specific → Step 1 (explorer) → Step 2 (planner) → Step 4 (coder/ui)
- Single-line typo fix or comment-only edit → Step 4 (coder/ui) directly

## State Files

| File | Owner | Purpose |
|------|-------|---------|
| `USER_REQUIREMENTS.md` | requirements_collector writes, manager reads | Refined requirements from ambiguity resolution. Input to planner. |
| `PLAN.md` | planner writes, manager reads | Written after collaborative planning with user. Amendments appended under `## Amendments` only — original contracts stay unchanged. |
| `WORKING_STATE.md` | manager writes | Current phase, task status, blockers, decisions |

## Agent Permissions

```json
[
  {"agent":"manager",                "can":["read","glob","grep","list","task","todowrite","question","webfetch","websearch","skill"],"cannot":["edit","bash"]},
  {"agent":"requirements_collector", "can":["read","glob","grep","list","question","edit (USER_REQUIREMENTS.md only)"],"cannot":["bash","task","todowrite","webfetch","websearch","skill"]},
  {"agent":"planner",                "can":["read","glob","grep","list","edit (PLAN.md only)","question","task","webfetch","websearch","external_directory","skill"],"cannot":["bash","todowrite"]},
  {"agent":"coder",                  "can":["read","glob","grep","list","edit","bash","task","todowrite","question","external_directory","skill"],"cannot":["webfetch","websearch"]},
  {"agent":"reviewer",               "can":["read","glob","grep","list","task","webfetch","external_directory","skill"],"cannot":["edit","bash","todowrite","question","websearch"]},
  {"agent":"ui",                     "can":["read","glob","grep","list","edit","bash","task","todowrite","question","webfetch","websearch","external_directory","skill"],"cannot":[]},
  {"agent":"explorer",               "can":["read","glob","grep","list","task","webfetch","websearch","external_directory"],"cannot":["edit","bash","todowrite","question","skill"]}
]
```

## Role Boundaries

### Manager
- Owns sequencing, state, and synthesis. Routes ambiguous requests to `requirements_collector`, clear requests directly to `explorer` → `planner`. Routes all implementation to `coder`/`ui`, all discovery to `explorer`.
- Reads `PLAN.md` from disk — uses working context for phase state and decisions only.
- Derives phase map from the dependency graph before dispatching any implementation task.
- Dispatches one phase at a time. Waits for all tasks in a phase to complete before advancing.
- Passes each coder only its own contract block from `PLAN.md`.
- Review is `coder`'s and `ui`'s responsibility — manager dispatches to them and waits for their completion report.
- On blocker after 3 coder cycles: re-engages planner for that task only. Planner appends amendment to `PLAN.md`.

### Requirements Collector
- Receives ambiguous user requests from manager. Resolves every ambiguity through structured questions with options.
- Uses the `question` tool exclusively for user interaction. Each question has concrete options plus a custom answer.
- Writes refined requirements to `USER_REQUIREMENTS.md`. Returns to manager with summary and confidence assessment.
- Does not design solutions. Does not read the codebase for implementation details. Focuses solely on what the user wants.

### Planner
- **Produces**: interface contracts (signatures, input/output constraints, side effects), dependency graph, task index, edge cases, risks — written to `PLAN.md`.
- **Collaborative planning**: after initial codebase analysis, presents design decisions to the user via `question` tool. Iterates until user accepts the plan. Writes final `PLAN.md` only after user confirmation.
- **Interface boundary** — contract ends at the interface; coder owns everything inside:

  | Contract covers | Coder owns |
  |-----------------|------------|
  | Function signature | Algorithm strategy |
  | Parameter constraints | Local variable names |
  | Return type and error conditions | Internal data structures |
  | Side effects | Imports and boilerplate |
  | File path and insertion point | Implementation steps |

- **Completion test**: when a coder can read the contract and still make zero implementation decisions, the contract is complete.
- Flags every ambiguity in the Unknowns field with a precise description and what decision it blocks.

### Coder / UI
- Receives one contract block. Owns all internal implementation decisions: variable names, data structures, algorithm choice.
- Reads surrounding code before editing. Matches existing style.
- Every line changed must trace back to a specific contract requirement.
- Applies Code Standards to every function, method, and class written or modified.
- Validates with lint/tests before calling reviewer.
- Calls reviewer after every implementation and after every fix.
- Fix loop: max 3 reviewer cycles. Unresolved CRITICAL or WARN after 3 → escalate to manager.
- Task closes on one condition: `Verdict: PASS` from the reviewer.

### Reviewer
- Called by `coder` or `ui` — manager dispatches to coder/ui only.
- Reads the assigned file:line range (±10 lines for context).
- Verifies in order: signature match, input constraints enforced, output contracts satisfied, side effects correct, correctness within scope.
- Code standards (docstrings, type annotations) checked only after contract checks 1–5 are fully clean. Reported as INFO — INFO findings allow PASS.
- Hard cap: 5 findings. Findings budget allocated to contract violations (CRITICAL/WARN) first, code standards (INFO) second.
- Outputs only the verdict block. Verification reasoning is internal.

| Severity | Use when | Blocks PASS |
|----------|----------|-------------|
| CRITICAL | Contract violation, broken behavior, security issue | Yes |
| WARN | Likely bug or fragile code within contracted scope | Yes |
| INFO | Code standards: docstrings, type annotations, style | No |

### Explorer
- Returns file paths, line numbers, and 1-line descriptions.
- Marks findings requiring architectural reasoning or code interpretation as `[needs planner]`.
- Uses bash for search commands only: `grep`, `find`, `cat`, `head`, `ls`.

## Code Standards

These apply to every function, method, and class written or modified by any agent. The reviewer checks them after contract compliance is confirmed and reports violations as INFO.

### Docstrings

Every public function, method, and class must have a docstring matching the project's chosen documentation style. Include parameter descriptions, return value descriptions, and exception descriptions where applicable.

- Private helpers (`_name` or language-equivalent) must have a docstring when the logic is non-obvious.
- Omit parameter/return/exception sections only when the function is a trivial one-liner with a self-explanatory signature.

### Strong Typing

Every parameter and return value must be type-annotated using the project's language conventions.

| Rule | Correct | Wrong |
|------|---------|-------|
| Always annotate return type | annotated return type present | missing return type annotation |
| Use parameterized generic types | parameterized collection type | bare unparameterized collection type |
| Annotate nullable params | nullable type annotation | unannotated param with a null default |
| Fixed value sets | literal/enum type | bare string type |
| When dynamic types are necessary | add a comment explaining why | bare dynamic type with no justification |

Missing annotation or unjustified dynamic type is an INFO finding — reported but does not block PASS.

## Token Optimization

- `explorer` is cheapest — use it for all file discovery instead of planner or coder.
- Manager receives summaries from subagents — never raw tool output.
- Manager reads `PLAN.md` from disk rather than holding it in context.
- Each coder receives only its own contract block, not the full plan.
- `WORKING_STATE.md` is the source of truth for phase progress — not conversation history.
- All agents run at `temperature: 0.1` to reduce variance and verbosity.

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