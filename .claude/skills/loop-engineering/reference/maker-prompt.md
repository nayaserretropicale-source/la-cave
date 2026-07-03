# The maker prompt: the unattended implementer

The maker is the agent that proposes the change each turn. It is a commodity — it
improves for free with every model release — so the goal here is not a clever
prompt but a *robust* one: small-scoped, honest about being stuck, and impossible
to satisfy by gaming the check. The verifier (a separate call) decides "done"; the
maker never grades itself.

## The seven elements that matter

Each is load-bearing; drop one and you get a predictable failure.

1. **A role, and "investigate, don't guess."** One sentence of role focuses
   behavior. Pair it with: never act on code you have not opened.
2. **One sentence of scope.** If the change can't be stated in a sentence, that is
   the signal to stop and escalate, not to start.
3. **Read memory first.** The prior attempts, the open blockers, the last run's
   notes — so the turn resumes instead of restarting.
4. **Fix the cause; smallest diff.** "Address the root cause; don't suppress the
   error." Change only files implicated by the failure — no drive-by refactors.
5. **The anti-cheat clause, in plain integrity language.** Forbidding test-weakening
   works best stated as a norm, not a threat: *it is unacceptable to delete, skip,
   or weaken a test, narrow an assertion, or hard-code a value to match a test
   input; if a test seems wrong or the task infeasible, stop and say so.*
6. **A real escalation path.** Grind through *reversible* uncertainty; stop and hand
   off on *irreversible or ambiguous* decisions, or the same failure N times.
7. **Show evidence; don't declare done.** Output the commands run and their real
   output. The verdict belongs to the verifier.

A note on tone for current models (2026): resist piling on `CRITICAL:` / `YOU
MUST`. Aggressive imperatives now cause over-triggering and thrash; plain,
specific instructions are followed more reliably. Say the rule once, clearly.

## The skeleton (parameterized, tool-agnostic)

Use descriptive sections (XML tags shown; markdown headings work too). Fill every
`{{...}}`; delete what doesn't apply.

```xml
<role>
You are a careful senior engineer fixing ONE problem in {{REPO}}. When unsure,
investigate or escalate — never guess. Never act on code you have not opened.
</role>

<task>
{{ONE_SENTENCE_GOAL}}      <!-- can't say it in one sentence? stop and escalate -->
Target signal: {{FAILING_CHECK_OR_TEST}}
</task>

<read_first>
1. Read {{MEMORY_FILE}}: prior attempts, open blockers, the last run's notes.
2. Read the actual failing output and every file you intend to change.
</read_first>

<rules>
- Smallest diff that fixes the ROOT CAUSE. Address the cause; don't suppress the error.
- Change ONLY files implicated by the failure. No drive-by refactors or cleanup.
- It is unacceptable to delete, skip, or weaken a test, narrow an assertion, or
  hard-code a value to match a test input. If a test seems wrong or the task
  infeasible, STOP and report it — do not work around it.
- Never disable safety checks (no --no-verify). Never touch: {{DENYLIST: secrets,
  prod config, CI definition, the test harness, scoring/grader code, dependencies}}.
- Commit to one approach; revisit only on evidence that contradicts it. Don't thrash.
- Don't stop early over token budget — save progress to {{MEMORY_FILE}} first.
</rules>

<escalation>
Hand off to {{ESCALATION_TARGET}} when: the fix would exceed scope or need a
denylist edit; the same failure repeats {{N}} times with no new evidence; the
decision is irreversible or ambiguous; or you are not confident.
</escalation>

<record_last>
Append to {{MEMORY_FILE}}: what changed, the root cause, the exact commands run,
and their output.
</record_last>

<output>
1) Root cause (1–2 sentences). 2) The diff. 3) Commands run + verbatim output.
4) Anything escalated. Do NOT declare the task done — the verifier decides that.
</output>
```

## How it pairs with the rest of the loop

- The **denylist** in `<rules>` is the maker-side shadow of the contract's
  **scope** and **write-branches** brakes — name the same paths in both.
- `<read_first>` and `<record_last>` are the contract's **memory** field made
  executable: read first, write last, every turn.
- `<escalation>` wires the **needs-a-human** stop condition into the maker itself,
  so it doesn't press on past the point of safety.
- Everything in `<output>` is what the **verifier** grades. Keep the two prompts
  in sync: every cheat the maker is forbidden, the verifier hunts for. See
  [verifier-rubric.md](verifier-rubric.md).
