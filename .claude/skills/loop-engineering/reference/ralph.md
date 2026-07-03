# Ralph-style loops (the simplest possible shape)

Ralph is the original, purest loop — described by Geoffrey Huntley on 14 July
2025. It is the entire idea of loop engineering compressed into one line of bash:
pipe a fixed prompt into a coding agent, over and over.

```bash
while :; do cat PROMPT.md | your-agent; done    # Huntley's original used | claude-code
```

Huntley calls the technique "deterministically bad in an undeterministic world":
deliberately dumb, but it works through iteration and tuning. It predates the
"loop engineering" name by nearly a year and is where the practice comes from.

In one line, Ralph proves the two load-bearing ideas — *run a model in a loop
toward a goal* and *keep state on disk between turns*. But on its own it has **no
separate checker, no real stop condition, and no sandbox.** Everything this skill
adds — a separate verifier, the four stop conditions, a budget, a worktree — is
what turns that raw line into a loop you can trust unattended. Use Ralph to
understand the shape; do not point raw Ralph at a repo you care about.

## When to use it

Ralph shines on **greenfield** work, building something new from a spec, where
there is not yet a codebase the loop can break. On a mature repo, a runaway Ralph
loop is dangerous; prefer a `/goal`-gated loop with a verifier and a budget.

## The mechanics that make it work

- **One thing per loop.** Ask for exactly one task per turn; trust the model to
  pick the most important item from a `fix_plan.md`. This is the key to not
  overflowing the context window.
- **Context discipline.** The more of the window you burn, the worse the output.
  Keep each turn lean; dump long logs to disk.
- **External memory across resets.** A `fix_plan.md` (the TODO list, rewritten
  often) and an `AGENTS.md` (how to build and run, updated when the loop learns
  something). The agent forgets between turns; these files do not.
- **Sub-agents as a scheduler.** Use the main context to dispatch cheap sub-agents
  for fan-out reads, and a single sub-agent for build/test to avoid back-pressure
  problems.
- **Back pressure is verification.** As Huntley puts it, generating code is easy
  now; what is hard is ensuring the agent generated the *right* thing. Wire tests,
  types, linters, and scanners as "back pressure" that rejects bad output, and
  keep the wheel turning fast.

## There is no magic prompt

Huntley is blunt: there is no perfect, shareable `PROMPT.md`. His own prompts
evolved through continual tuning by watching the model's behavior. Copy the
*shape*, then tune the words against your own runs. Always pair Ralph with a
budget and a gate so the loop can stop.
