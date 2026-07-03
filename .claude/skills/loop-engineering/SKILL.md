---
name: loop-engineering
description: >-
  Design and scaffold an autonomous "loop" around a coding agent for a recurring
  workflow. Use when the user wants to stop hand-prompting an agent and instead
  build a system that discovers work, delegates it to a maker, verifies the
  result with a separate checker, remembers progress on disk, and re-runs until a
  goal is met or it stops for an honest reason. Triggers on "build a loop", "loop
  engineering", "automate this agent workflow", "design an agentic loop", "/goal",
  "/loop", "Ralph loop", "maker/checker", "run this overnight", "verifier rubric",
  or "loop contract". Works with Claude Code, Codex, Cursor, and OpenCode.
license: MIT
metadata:
  version: "1.1"
---

# Loop Engineering

Help the user replace *themselves* as the thing that prompts a coding agent. The
deliverable is a small system that discovers work, hands it to a maker, verifies
the result with a **separate** checker, writes down what is done, decides what is
next, and re-runs until a goal is met, then stops for an honest reason.

Your job in this skill is not to write the loop for them in one shot. It is to
**interview, design the contract, then scaffold** so they end with a loop they
can actually run and trust.

## What a loop is, and is not

A loop is **not** a cron job. A cron job repeats blindly. A loop discovers work,
verifies it with a separate checker, persists state, decides what is next, and
stops for a reason. If the thing you are building cannot stop on its own, it is a
bug, not a loop.

Build stop conditions first. They are what let the user walk away.

## Step 0: decide whether a loop is even the right tool

Before designing anything, apply this test. A loop pays off only when **both** are
true:

1. There is a **clear, machine-checkable success criterion** (a test passes, a
   build is green, a schema validates, a rubric returns PASS).
2. Reaching it involves **tedious trial and error** the user would otherwise do by
   hand, turn after turn.

If the user cannot state how a machine would *know* the work is done, **stop and
say so.** A loop with no verifiable done-condition does not converge; it thrashes
and burns tokens. Help them find a checkable proxy first, or recommend they keep
prompting by hand. Do not build a loop to avoid understanding the work.

Two more preconditions the test assumes: the work **recurs often enough to
amortize** the loop's fixed cost (a rough floor is weekly; if it is rarer, write a
script, not a loop), and the agent **has an engineer's tools** to get unstuck on
its own (read logs, reproduce a failure, run its own code). If a check exists in
principle but the agent cannot run it, you have a human relay, not a loop yet.

Good loop candidates: fixing failing CI, triaging an issue inbox, dependency
upgrades against a solid test suite, performance tuning with a benchmark, flaky
test hunts, doc builds that must stay green. Poor candidates: open-ended design,
anything where "good" is a matter of taste with no proxy, one-off tasks.

## Step 1: interview the user (fill the loop contract)

Ask these questions. Lead with the verification question — it is the one that
decides whether the loop is viable. Do not ask all eleven at once; ask in small
batches, and infer what you safely can from the repo.

1. **Objective.** What is the recurring work you keep doing by hand? What should
   the loop make *true*?
2. **Done-condition (ask first, ask hard).** How would a machine *know* it is
   done, with no human looking? Name the exact command or check.
3. **Trigger.** What starts a run: a schedule (every N minutes/nightly), an event
   (push, new issue, webhook, CI failure), or an adaptive cadence (the loop picks
   its own next interval from what it found)?
4. **Discover / intake.** How does a run pick what to work on? (read CI status,
   query the issue tracker, read a `fix_plan.md`, scan alerts)
5. **Workspace.** Where does it act, and what is strictly off-limits? (a git
   worktree or sandbox; never force-push, touch secrets, change deps, hit prod)
6. **Context.** What must each run read to not re-derive the project from zero?
   (a `SKILL.md` / `AGENTS.md`, the spec, the memory file)
7. **Delegation.** Which agent does the work (the maker), and which *separate*
   one checks it (the checker)? They must not be the same call.
8. **Verification.** What gates must pass for "done" to be true? (unit tests,
   lint, types, an LLM-as-judge rubric returning PASS/FAIL with evidence)
9. **Memory / state.** Where is progress stored so a run can resume after a
   restart? (a markdown file, an issue tracker, a `state.json` on disk)
10. **Budget.** The hard ceilings: max iterations, max runtime, max tokens, and a
    dollar cap if a credential can spend money.
11. **Hand-off.** When does it escalate to a human instead of pressing on?
    (ambiguous, high-risk, or the same failure twice with no new evidence)

Record answers into [templates/loop-contract.template.md](templates/loop-contract.template.md).
If the user cannot answer #2 with a concrete check, return to Step 0.

## Step 2: write the loop contract

Fill the template into a real `loop-contract.md` in the user's repo. This is the
design artifact the loop is built from and reviewed against. Keep it short and
concrete. Every field should name a command, a path, or a number, not a vibe.

## Step 3: choose the smallest shape that fits the tool

**First, know which agent you are in.** You are running *inside* one of these
tools, so you usually already know which. If you genuinely cannot tell, ask one
question: "Which agent will run this — Claude Code, Codex, Cursor, or OpenCode?"
Then tailor every artifact in Step 4 to *that* tool. The names differ, the trigger
differs, and which brakes are a native flag versus something you wire yourself
differs. Do not hand a Claude Code user a Codex `*.toml`, and do not tell an
OpenCode user to wire a circuit breaker it already ships.

Pick the simplest mechanism that satisfies the contract; do not reach for
multi-agent orchestration when one `/goal` will do. See
[reference/tool-mapping.md](reference/tool-mapping.md) for the full per-tool
mapping, including which brake is native where.

- **Claude Code:** `/goal` for the verified stop condition (a *separate* model
  grades each turn), sub-agents in `.claude/agents/` for maker/checker, a hook or
  scheduled task for the trigger, `claude -p ... --output-format json` for headless
  runs. The turn and dollar brakes are native flags: `--max-turns`,
  `--max-budget-usd` (and `total_cost_usd` comes back in the JSON).
- **Codex:** the Automations tab for the trigger, `codex exec --json` for headless
  runs, `codex exec resume --last` to continue, a checker sub-agent in
  `.codex/agents/*.toml`. The sandbox is `read-only` by default; opt up to
  `workspace-write` explicitly. The turn and dollar caps you count yourself.
- **Cursor:** native Automations (cron + events) for the trigger, `cursor-agent -p
  ... --output-format json` for headless runs — that mode has *full* tool access,
  so scope it — Cloud Agents to isolate work on their own branch and open a
  merge-ready PR, and either a `readonly: true` sub-agent in `.cursor/agents/` or
  Bugbot as the hosted PR checker.
- **OpenCode:** a GitHub Action on a workflow `schedule:` for the trigger,
  `opencode run ... --format json` (or `opencode serve` for the HTTP API) for
  headless runs, and the built-in read-only `plan` agent or a custom one in
  `.opencode/agents/` as the checker. Its `permission` block is the richest native
  scope, and `doom_loop` is a native circuit breaker — it trips on three
  consecutive identical tool calls, so set `"doom_loop": "deny"` to halt a stuck
  loop instead of wiring your own.
- **Greenfield / from scratch:** a Ralph-style bash loop,
  `while :; do cat PROMPT.md | agent; done`, with one task per turn and a
  `fix_plan.md`. Best when there is no codebase to break yet; pair it with a gate
  and a budget so it can stop. See [reference/ralph.md](reference/ralph.md).

## Step 4: scaffold the files

Generate concrete, runnable artifacts **in the chosen tool's own shape** (adapt
names to the user's stack). The four pieces are the same everywhere; the file
paths and the trigger are what change per tool:

- **The maker prompt** with the non-negotiable rules baked in (see laws below).
  Start from the parameterized skeleton in [reference/maker-prompt.md](reference/maker-prompt.md).
- **The verifier**: either a shell gate (the exact test/lint command) or a
  checker prompt that returns `PASS`/`FAIL` plus evidence and may `ESCALATE`.
  Start from [reference/verifier-rubric.md](reference/verifier-rubric.md). Put the
  checker where the tool reads sub-agents: `.claude/agents/` (Claude Code),
  `.codex/agents/*.toml` (Codex), `.cursor/agents/` with `readonly: true` (Cursor),
  `.opencode/agents/` or the built-in `plan` agent (OpenCode).
- **The memory file** (`fix_plan.md` or `state.json`) that a run reads first and
  writes last — identical across tools.
- **The runner**: the headless command for the chosen tool (`claude -p` /
  `codex exec` / `cursor-agent -p` / `opencode run`) wrapped by whatever fires it —
  a `while` loop, a cron line, a scheduled task, a GitHub Action, or the tool's
  native Automations — including the **gate** ("if the build is already green, do
  nothing") and the **budget** cap. Wire each brake to that tool's real handle: a
  native flag where it has one (Claude Code's `--max-turns` / `--max-budget-usd`,
  OpenCode's `doom_loop` and `permission` scope), counted in the runner where it
  does not. [reference/tool-mapping.md](reference/tool-mapping.md) has the headless
  command and the runner skeleton for each.

## Step 5: harden before letting it run

Walk the user through [reference/hardening-checklist.md](reference/hardening-checklist.md)
before the first unattended run. Always dry-run once with a tight budget and a
sandboxed credential before scaling up.

**Prove the verifier before you trust it.** The verifier is the asset the loop
rests on, so test it the way you'd test code: feed it two diffs for the same red
check — one that *fixes the cause*, one that *deletes or weakens the check* — and
confirm it `PASS`es only the first and `ESCALATE`s (or `FAIL`s) the second. If the
cheat slips through, the rubric is too loose; tighten it until the laziest passing
path is to do the real work. This two-diff test is the smallest honest eval of a
loop, and it is the one that matters most.

## The four honest stop conditions

Every loop must be able to stop for exactly one of these, and say which:

- **goal met**: the separate verifier confirms the done-condition.
- **budget spent**: an iteration, token, time, or dollar ceiling tripped.
- **stalled**: the same failure twice with no new evidence (stop thrashing).
- **needs a human**: high-risk or ambiguous, so it escalates. This is a success
  state, not a failure.

## The non-negotiable laws

Bake rules 1–5 into every maker's instructions. Rules 6–7 cannot be baked into a
maker — they are the engineer's to own, so make sure the user keeps them.

1. **The maker never grades its own work.** A separate checker decides "done".
   The model that wrote the code is far too generous marking its own homework. The
   maker's job is to *show evidence* — the command it ran and the real output — not
   to assert success.
2. **Never weaken or delete a test, or narrow a check, to make it pass.** Fix the
   cause. If the test is wrong, escalate; do not silently edit it.
3. **A loop that cannot stop is a bug.** Wire the four stop conditions before the
   first run.
4. **Memory lives on disk, not in the context.** Read it first each turn, write it
   last. The agent forgets between runs; the repo does not.
5. **Fix only the cause; do not widen scope.** Smallest change that could be right.
6. **Verification stays the engineer's responsibility.** "Done" is a claim, not a
   proof. The verifier is the asset the user owns; the maker is a commodity that
   improves for free with every model release.
7. **The fleet scales to the user's review rate, not the tool's lane count.** The
   human is the serial bottleneck. Usually the right number of parallel agents is
   a low single digit.

## What the loop never does for you

Say this plainly to the user so they keep the right job:

- **Verification.** A loop running unattended is also a loop making mistakes
  unattended. The separate checker makes "done" mean something; it does not make
  it certain.
- **Comprehension.** The faster the loop ships, the faster understanding-debt
  grows. Schedule time to read what it built.
- **Intent.** Why this work matters, and what "good" means, has to come from a
  human. The loop does not know the difference between using it to move faster on
  work you understand and using it to avoid understanding the work. You do.

Build the loop. But build it like someone who intends to stay the engineer, not
just the person who presses go.

## Further reading (optional)

If the user wants the theory behind these steps in depth — the loop anatomy and
the 11-part contract, `/goal` vs `/loop`, memory, token economics and the
orchestration tax, and the risks — point them to the *Awesome Loop Engineering*
handbook: <https://github.com/invincible04/awesome-loop-engineering> (readable
online at <https://invincible04.github.io/awesome-loop-engineering/>).
