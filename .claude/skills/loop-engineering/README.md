# The loop-engineering skill

A portable [agent skill](https://www.anthropic.com/news/skills) that helps an AI
coding agent design and scaffold an autonomous **loop** for a workflow you keep
doing by hand. Point your agent at it and it will interview you, fill in an
11-part **loop contract**, choose honest stop conditions and budgets, and
scaffold the files — so you finish with a loop you can actually run and trust.

## What is in here

| File | Purpose |
|------|---------|
| [`SKILL.md`](SKILL.md) | The skill itself: the interview, the design steps, the non-negotiable laws. |
| [`templates/loop-contract.template.md`](templates/loop-contract.template.md) | The fill-in 11-part contract, with a worked CI-repair example. |
| [`reference/tool-mapping.md`](reference/tool-mapping.md) | The same loop in Claude Code, Codex, Cursor, and OpenCode: building blocks, headless commands, the brakes mapped to each tool's native flags, and a runner skeleton. |
| [`reference/maker-prompt.md`](reference/maker-prompt.md) | The parameterized maker-prompt skeleton: small-scoped, anti-cheat, with a real escalation path. |
| [`reference/verifier-rubric.md`](reference/verifier-rubric.md) | How to build the separate checker (deterministic gate or LLM-as-judge), with the documented judge biases countered. |
| [`reference/ralph.md`](reference/ralph.md) | The from-scratch Ralph loop and when to use it. |
| [`reference/hardening-checklist.md`](reference/hardening-checklist.md) | Everything to verify before the first unattended run. |

## Install

### One command (recommended)

Run this from your project. It asks which agent you use and whether to install
for this project or for every project, then copies the skill into the right
folder:

```bash
npx github:invincible04/awesome-loop-engineering
```

Skip the prompts by naming a target:

```bash
npx github:invincible04/awesome-loop-engineering --tool=claude --scope=personal
```

`--tool` is one of `claude`, `cursor`, `codex`, `opencode`, or `agents`
(default `claude`); `--scope` is `project` or `personal` (default `project`).
Add `--list` to print every install path, or `--help` for all options.

### By hand

A skill is just a folder with a `SKILL.md`, so you can copy it yourself:

```bash
cp -r skill/loop-engineering .claude/skills/loop-engineering    # Claude Code
cp -r skill/loop-engineering .cursor/skills/loop-engineering    # Cursor
cp -r skill/loop-engineering .agents/skills/loop-engineering    # Codex (and any .agents/skills client)
cp -r skill/loop-engineering .opencode/skills/loop-engineering  # OpenCode

# Or pull just this folder with degit (swap the destination for your tool)
npx degit invincible04/awesome-loop-engineering/skill/loop-engineering .claude/skills/loop-engineering
```

On claude.ai, zip `skill/loop-engineering/` and upload it under
**Settings &rsaquo; Features**.

Skills are model-invoked: the agent loads one when the task matches its
`description`. You usually do not need to do anything beyond installing the
folder and asking for the thing the skill is about.

## Use

Ask your agent, in plain language:

> Use the loop-engineering skill to help me design a loop for **&lt;the thing you
> keep doing by hand&gt;**.

Concrete examples:

- "Use the loop-engineering skill to build a nightly loop that keeps `main` green."
- "Design an agentic loop that triages new GitHub issues and labels them."
- "Help me set up a `/goal` loop that upgrades my dependencies without breaking tests."

The agent will start by asking the one question that decides everything: **how
would a machine know the work is done?** If you cannot answer that with a real
check, the skill will tell you a loop is the wrong tool, and why. That honesty is
the point.

## Standalone

This skill is fully self-contained — every file it references lives inside this
folder, so it works on its own once copied into your project, with no dependency
on the repository it came from.

It is also the operational core of the **Awesome Loop Engineering** handbook. If
you want the theory the skill puts into practice, the handbook's chapters explain
it in depth: <https://github.com/invincible04/awesome-loop-engineering>
(read online at <https://invincible04.github.io/awesome-loop-engineering/>).

Released under the MIT License.
