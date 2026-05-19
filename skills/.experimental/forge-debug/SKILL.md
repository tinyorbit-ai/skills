---
name: forge-debug
description: Root-cause debugging with an iron law — no fix without an identified root cause. Four phases — investigate, analyze, hypothesize, implement a minimal fix plus a regression test. Surprising or instructive failures get written up as a wiki incident note. Use when something is broken, a test or gate fails, behaviour is wrong, "it worked yesterday", or when asked to "debug this", "why is this failing", "root cause this".
metadata:
  internal: true
---

# forge-debug

Finds the actual cause before changing anything, fixes it minimally, proves the fix
with a test, and captures instructive failures in the wiki.

## Charter

The project is worth building and worth getting right. Debugging is craft, not
triage-for-speed. The bar is "we understand why it broke", not "make it go away".

## Iron law

**No fix is written before its root cause is identified and stated.** Symptom
patching is forbidden. If you cannot name the cause, you are still in phase 1.

## Phase 1 — Investigate

- Collect the exact symptom: error text, stack trace, failing gate output, the
  reproducing input. Reproduce it deterministically; if you can't reproduce it,
  that unreliability *is* the first thing to investigate.
- Read the code along the actual failure path — don't guess from names.
- `git log --oneline -20` and diff recent changes touching the implicated files;
  "it worked yesterday" means the cause is probably in that window.
- Check `wiki/notes/` for prior incidents in the same area — this may be a repeat.

## Phase 2 — Analyze

Match against common shapes: race/ordering, nil/undefined propagation, state
corruption, boundary/off-by-one, config/env drift, stale cache, integration
contract mismatch, wrong-layer error handling, resource exhaustion. Narrow to the
mechanism. If external, a targeted web/docs search on the precise error is fair
game. End this phase with a one-sentence **stated root cause hypothesis**.

## Phase 3 — Hypothesize

Pick the single cheapest experiment that would *discriminate* — confirm or kill the
hypothesis, not just "try a fix". Run it. If it disproves the hypothesis, return to
phase 2 with what you learned. Only a confirmed root cause proceeds to phase 4.

## Phase 4 — Implement

- Fix the **root cause**, not the symptom. Smallest change that addresses the actual
  mechanism. If the right fix is at a different layer than the symptom, fix it there.
- Add a **regression test**: it must fail without the fix and pass with it. State
  that you verified both directions.
- Run the relevant phase's verifiable gate (from `wiki/plan.md`) and the full
  affected test suite. Show it green.
- If the fix touches more than ~5 files or crosses a phase boundary, stop and ask
  the user (AskUserQuestion) whether to split it or proceed.

## Capture

If the failure was non-obvious, instructive, or forced a decision, write
`wiki/notes/YYYY-MM-DD-slug.md`: timeline · root cause · the decision it forced ·
what it demonstrates. Link it from `wiki/index.md`. If it changed a design choice,
also add/update the relevant ADR. **Tell the user you wrote it**, in the same reply.
A clean fix without the lesson captured is a half-done fix.

## Rules

- Iron law is absolute: no root cause → no code change.
- The regression test is part of the fix, not optional follow-up.
- Respect branch discipline: debugging happens on the current phase branch; commit
  there, never on the base branch.
- Don't expand scope under cover of a bug fix — if you find more, note it in
  `wiki/improvements.md` and raise it, don't silently fix it.
