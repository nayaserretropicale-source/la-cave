# Tool mapping: the same loop in each agent

The building blocks are identical across tools; only the names of the levers
change. Pick the smallest mechanism that satisfies the contract.

| Block | Job | Claude Code | Codex | Cursor | OpenCode |
|-------|-----|-------------|-------|--------|----------|
| Automations | the trigger / heartbeat | scheduled task, hook, or GitHub Action | Automations tab | Automations (native cron + events) | GitHub Action + workflow `schedule:` |
| Worktrees | isolate parallel agents | `git worktree add` | worktree per thread | Cloud Agents (own branch) or `git worktree` | `git worktree add` |
| Skills | codify project knowledge | `SKILL.md` / `CLAUDE.md` | `AGENTS.md` | `.cursor/rules` (`.mdc`) / `AGENTS.md` | `AGENTS.md` |
| Connectors | touch real tools and data | MCP + plugins | Connectors (MCP) | MCP (`.cursor/mcp.json`) | MCP (local + remote) |
| Sub-agents | keep maker separate from checker | `.claude/agents/` | `.codex/agents/*.toml` | `.cursor/agents/` (`readonly`), Bugbot | `.opencode/agents/`, built-in `plan` |
| Memory | done and next, on disk | a markdown file or tracker | a markdown file or tracker | a markdown file or tracker | a markdown file or tracker |

## Headless run commands

These run the agent non-interactively with machine-readable output. A loop is
just one of these driven by something other than you, with a gate and a budget.

```bash
# Claude Code: one-shot, machine-readable, pre-approved tools
claude -p "fix the cause of these failures; do not weaken tests" \
  --allowedTools "Read,Edit,Bash" --output-format json
  # returns the result and total_cost_usd

# Codex: read-only by default; opt up explicitly; JSONL + resume
codex exec --json "summarize the failing tests and fix the cause"
codex exec resume --last "now fix the race condition you found"

# Cursor: full tool access in -p mode, so scope it; JSON has no cost field
cursor-agent -p "fix the cause of these failures" --output-format json

# OpenCode: model-agnostic; --format json for an event stream
opencode run "fix the cause; don't weaken tests" \
  --model anthropic/claude-sonnet-4-5 --format json
```

## The brakes, per tool (native flag vs wire-it-yourself)

The brakes in the loop contract are a *checklist of limits to guarantee*, not a
file any tool reads. No single agent ships all six natively, and each leads on a
different one. Wire each brake to the real handle below; where a tool has none,
count it in the runner. (Verified against each tool's official docs — and, for
`doom_loop`, the OpenCode source — mid-2026; re-check before relying on it.)

| Brake | Claude Code | Codex | Cursor | OpenCode |
|-------|-------------|-------|--------|----------|
| Turn cap | **native** `--max-turns N` (exits non-zero) | count `turn.completed` | count turns yourself | count turns yourself |
| Dollar ceiling | **native** `--max-budget-usd X` (estimate); `total_cost_usd` in JSON | $ self; opt-in native *token* budget `features.rollout_budget` | self (JSON has no cost field) | self (account-level cap only) |
| Scope / read-only | permission rules + sandbox | **native** `--sandbox` (read-only default) | Run Mode + protections + allowlist + `.cursorignore` | **native & richest** `permission` allow/ask/deny per tool |
| Write-branches | `--worktree` + branch protection | worktree + branch protection | Cloud Agents auto-isolate to a branch | deny `git push` in `permission.bash` |
| Circuit breaker (same call N×) | wire it (auto mode pauses after 3 blocks) | wire it | wire it | **native** `doom_loop` (trips at 3 identical calls; default `ask`) |
| Watchdog (silence = alarm) | wire it (wrapper timer) | wire it | wire it | wire it |

So: Claude Code alone gives you native turn and dollar caps; OpenCode gives the
richest native scope *and* the only native circuit breaker (`doom_loop` fires on
three consecutive byte-identical tool calls — set it to `deny` to halt a stuck
loop unattended); Cursor gives the only productized native heartbeat (Automations
+ Cloud Agents). The watchdog is always yours to wire.

## The runner skeleton (tool-agnostic)

```bash
#!/usr/bin/env bash
set -euo pipefail

MAX_ITERS=8
i=0

while (( i < MAX_ITERS )); do
  # GATE: if the done-condition already holds, there is no work to do.
  if make ci >/dev/null 2>&1; then
    echo "goal_met: ci is green"; exit 0
  fi

  i=$((i+1))
  echo "turn $i"

  # MAKER: act non-interactively on the discovered work.
  your-agent -p "$(cat PROMPT.md)" --output-format json > .loop/last.json

  # CHECKER: a SEPARATE evaluation decides 'done', not the maker.
  # (re-run the gate above next iteration; or call a checker agent here)

  # MEMORY: record what happened so the next turn resumes, not restarts.
  update-fix-plan .loop/last.json fix_plan.md
done

echo "budget_spent: hit $MAX_ITERS iterations without a green build" >&2
exit 1
```

The two lines that make this a loop and not a runaway script are the **gate**
(skip when already done) and the **budget** (`MAX_ITERS`). Keep both.

## `/goal` vs `/loop` (Claude Code)

- `/loop` re-runs on a cadence. Useful, but it does not know whether it succeeded.
- `/goal` keeps going until a verifiable condition is true, checked by a separate
  model each turn, so the agent that wrote the code is not the one grading it.
  This is the workhorse of serious loops. Prefer it whenever you can state the
  done-condition.

These are Claude Code's commands. Codex has a `/goal` command too, but it's a
standing target rather than a per-turn verifier, and it has no `/loop` — its
cadence comes from the Automations tab.
