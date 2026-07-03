# Loop contract: &lt;name your loop&gt;

> Copy this file to `loop-contract.md` in your repo and fill every field with a
> command, a path, or a number, not a vibe. This is the design the loop is built
> from and reviewed against. If you cannot fill in **Done-condition** with a real
> check, do not build the loop yet.

| Field | Your answer |
|-------|-------------|
| **Objective** | What this loop makes true, in one sentence. |
| **Done-condition** | The exact check that proves it (`pytest -q tests/auth` exits 0; `npm run build` is green; rubric returns PASS). |
| **Trigger** | Schedule, event, or adaptive cadence that starts a run (nightly cron; push to `main`; new issue labeled `bug`; or the loop picks its own interval from what it found). |
| **Discover / intake** | How a run selects what to work on (read CI status; query issue tracker; read `fix_plan.md`). |
| **Workspace** | Where it acts, and what is off-limits (a git worktree; never force-push, touch `.env`, change deps, or hit prod). |
| **Context** | What each run reads first (`AGENTS.md`, the spec, the memory file). |
| **Delegation** | The maker, and the *separate* checker. |
| **Verification** | The gates that must pass (tests + lint + types; or an LLM-as-judge rubric with evidence). |
| **Memory / state** | Where progress is stored so a run can resume (`fix_plan.md`; `state.json`; issue comments). |
| **Budget** | Hard ceilings: max iterations, max runtime, max tokens, dollar cap. |
| **Hand-off** | When it escalates to a human (ambiguous, high-risk, same failure twice). |

## Stop conditions

This loop stops, and reports which, on:

- [ ] **goal met**: verifier confirms the done-condition
- [ ] **budget spent**: &lt;iterations&gt; / &lt;tokens&gt; / &lt;minutes&gt; / &lt;dollars&gt;
- [ ] **stalled**: same failure twice with no new evidence
- [ ] **needs a human**: escalates on: &lt;conditions&gt;

## Brakes

Stop conditions are the loop ending *well*; brakes force a halt when it cannot
tell it has gone wrong. Scope by what it can break, not by what you want it to do.
This is a checklist of limits to guarantee, not a file any tool reads — some are
native flags (Claude Code's `--max-turns`, `--max-budget-usd`; a sandbox for
scope), the rest you wire into the runner.

```yaml
max_turns: <n>             # hard step ceiling
max_budget_usd: <n>        # money ceiling per run (if a credential can spend)
scope: [<paths>]           # read-only outside these paths (sandbox / permissions)
write_branches: [<glob>]   # blast radius: only branches it may write (worktree + hook)
circuit_breaker: <n>       # same call n× in a row -> halt (≠ stalled = same failure)
watchdog: <state-file>     # no progress write when due -> alarm, not silence
```

---

## Worked example: nightly CI-repair loop

| Field | Answer |
|-------|--------|
| **Objective** | Keep `main` green overnight so the team starts the day unblocked. |
| **Done-condition** | `make ci` exits 0 (unit + integration + lint). |
| **Trigger** | Cron, every night at 01:00, only if the last commit is newer than the last green run. |
| **Discover / intake** | Read the failing job names and logs from the most recent CI run. |
| **Workspace** | A fresh git worktree per run on a `loop/ci-repair` branch. Never force-push; never touch `infra/` or secrets. |
| **Context** | `AGENTS.md` (how to build and test), the failing logs, `fix_plan.md`. |
| **Delegation** | Maker: implementer agent. Checker: a separate agent that re-runs `make ci` and reviews the diff scope. |
| **Verification** | `make ci` exits 0 **and** the diff touches only files implicated by the failure. |
| **Memory / state** | `fix_plan.md` (what was tried, what is next), updated last each turn. |
| **Budget** | 8 iterations, 60 minutes, 300k tokens per night. |
| **Hand-off** | Opens a PR for human review on success; escalates with a summary if the same test fails twice, or if a fix would require changing a test. |

Stop conditions: goal met (PR opened), budget spent (8 turns), stalled (same red
test twice), needs a human (a fix would weaken a test).

Brakes: `max_turns: 8`, `max_budget_usd: 5`, `scope: [src/, tests/]` (read-only
elsewhere), `write_branches: [loop/ci-repair]`, `circuit_breaker: 3`,
`watchdog: fix_plan.md`.
