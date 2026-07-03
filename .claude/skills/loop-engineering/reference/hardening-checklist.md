# Hardening checklist: before the first unattended run

Walk every box before you let the loop run without you in the room. A loop that
fails these is not ready to be trusted with your repo, your tokens, or your time.

## Stop conditions (the loop can halt on its own)

- [ ] The done-condition is a real, machine-checkable command, not a vibe.
- [ ] A hard **iteration** cap is wired (`MAX_ITERS`).
- [ ] A **token / runtime / dollar** ceiling is wired where the platform allows.
- [ ] A **stall** detector stops on the same failure twice with no new evidence.
- [ ] A **circuit breaker** halts on the same call N times in a row (distinct from
      stall: same *action*, not same *failure*).
- [ ] A **watchdog** treats a missing progress write as an alarm, so a loop that
      stalled while *looking* busy gets caught, not trusted.
- [ ] Escalation to a human is a defined, reachable state, not an afterthought.

## Verification (done means something)

- [ ] The checker is a **separate** call from the maker.
- [ ] The rubric is adversarial: the laziest way to pass is to do the real work.
- [ ] "Changed a test to make it pass" is an **escalate**, never a pass.
- [ ] The diff-scope is checked: no drive-by edits outside the implicated files.

## Safety (a rogue run is contained)

- [ ] Runs in a **sandbox or worktree**, not your working tree.
- [ ] **Blast radius is scoped first:** read-only outside named paths, writes
      confined to named branches. Scope by what it can break, not what it should do.
- [ ] No **force-push**, no dependency changes, no prod access unless explicitly
      granted.
- [ ] Any credential is **scoped to staging** and carries a **budget limit**.
- [ ] Network access is restricted to trusted hosts if running tools blindly.

## Memory (a run resumes, not restarts)

- [ ] State is written to **disk**, not held only in the context.
- [ ] A run **reads the memory first** and **writes it last**.
- [ ] You can kill the loop mid-run and the next run picks up cleanly.

## The orchestration tax (you stay the bottleneck on purpose)

- [ ] The number of parallel agents is scaled to **your review rate**, a low
      single digit, not to the tool's lane count.
- [ ] Output is reviewable: small diffs, a summary per run, evidence attached.
- [ ] You have scheduled time to actually **read** what the loop ships, so
      comprehension debt does not compound silently.

## Final dry run

- [ ] Run once with the tightest possible budget and a sandboxed credential.
- [ ] Confirm it stops for the **right reason** and reports which of the four
      stop conditions fired.
- [ ] Only then raise the budget and let it run unattended.
