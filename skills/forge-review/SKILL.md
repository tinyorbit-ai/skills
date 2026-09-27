---
name: forge-review
description: Staff-grade review of a just-built forge phase — security, tests, strict types, a gate check and a cross-model pass, auto-fixing objective findings. Step after forge-build. Use only for a forge phase, when asked to "review the phase" or for a "security and quality review". Not for ad-hoc diffs/PRs.
---

# forge-review

The quality gate between building a phase and shipping it. Security, real tests,
strict types, runtime verification, third-party eyes — then **fixes what it
finds** and remembers the lesson. The third-party pass is configurable — Codex,
Gemini, or Claude — via the shared reviewer abstraction
(`../forge/references/reviewer-agents.md`).

## Scope

Review the **current phase's diff** against the base branch (`git diff <base>...HEAD`
on the phase branch) plus anything that diff touches. Read `wiki/learnings.md`
first — its rules are mandatory and enforced here; a violation of a past learning is
a high-severity finding. When a learning drives a finding or a check, say so
visibly: `Prior learning applied: <rule> (from <date>, phase <n>)` — the
compounding should be legible, not silent.

Re-runs are idempotent (`references/re-review.md`): an unchanged fingerprint whose
record ended green skips the passes; a changed one gets a **re-review** (prior findings
audited first, then the delta since the last reviewed HEAD). The terminal command block
runs in full either way.

## Triage — scale the machinery, not the bar

Classify the diff first; record the tier in the review record. **light** (docs/copy/
config only, zero logic — pass 0 plus the terminal block; any hint of logic
promotes), **standard** (default — all passes, third-party pass per config),
**deep** (multi-system, schema/auth/payments/public-API surface, or a very large
diff — third-party pass required, surrounding-source reading widened to every
touched subsystem). Risk promotes; escalation goes up only. The bar never moves.

## The passes (run all; details in `references/review-standards.md`)

0. **Scope & completion audit.** Two checks before any quality pass:
   - **Scope drift** — compare the diff's files against the phase spec's stated
     intent; classify `CLEAN / DRIFT (out-of-scope files, cite each) /
     REQUIREMENTS MISSING (spec'd work absent from the diff)`. Drift isn't
     automatically wrong — but it's never silent.
   - **Plan completion** — extract the phase's Work bullets and gate as a
     checklist; verdict each item `[DONE] / [PARTIAL] / [NOT DONE]` with the
     evidence path. Be conservative: a touched file is not a DONE — the specific
     behavior must be present. Details in `references/review-standards.md`.
1. **Security & abuse.** Trust boundaries, input validation, authz, secrets, injection
   (SQL / command / LLM-prompt / path), unsafe deserialization, dependency risk,
   anything touching untrusted input. Severity-tag every finding.
2. **Tests — covered, green, no heavier than needed.** Every behavior the phase
   added goes red if it regresses (`forge-principles` rule 6). Missing or weak
   coverage is a finding to fix. The suite passes, shown: scoped to the diff by
   default, the full suite when it is fast or the diff touched shared code. Test cost
   is reviewable too (`references/review-standards.md`).
3. **Strict type safety.** The project's current strict config, escape hatches banned
   (`references/strictness.md`). Type check passes clean.
4. **Correctness & edges.** The edges in `forge-principles` rule 3, plus the
   reachable input classes for this diff (`references/review-standards.md`).
5. **Economy & performance — the whole diff, tests included.** Objective and
   auto-fixable: collapse pass-through layers, inline single-caller abstractions,
   delete unused extension points and speculative config, reuse an existing path,
   split giant functions, fix accidental quadratics. Duplicate, mirror or over-mocked
   tests and oversized fixtures are fixed by **deletion**. For every path the diff
   touched, remove what it made dead (old branch, orphaned helper, callerless shim,
   test whose behavior is gone) (`../forge-principles/references/simplicity.md`). A
   smaller diff that still passes the gate is a fix, not a suggestion.
6. **Runtime verification.** Actually run it: execute the phase's verifiable gate
   and show it green, then exercise the phase **goal** like a real user (UI: drive
   the flow incl. loading/empty/error states; CLI/lib: real + adversarial inputs;
   data: verify against the real store). A gate that passes while the goal is unmet
   is itself a high-severity finding.
   - If the phase diff **touched UI** and `DESIGN.md` exists, first run the
     objective token pass: grep the diff for raw color literals, off-scale px
     values, and `font-family` declarations outside the system. Each hit is an
     objective finding — fix to tokens now, don't leave it for polish's visual pass.
   - If the phase diff **touched UI**, invoke **`forge-polish`** here (designer's-eye
     pass on the running screens). Its objective fixes fold into this review.
   - If the build is **developer-facing** (CLI/API/SDK/lib), invoke **`forge-dx`**
     here (live onboarding/TTHW/error-message audit). Same: objective fixes fold in.
   - Both are scoped to what the phase changed and skip cleanly if out of scope.
7. **Third-party adversarial pass (required at deep tier, else per config).**
   Resolve the reviewer per **`../forge/references/reviewer-agents.md`** — explicit
   `wiki/.forge/config.yaml`, then `$FORGE_REVIEWER`, then the first installed CLI
   from a different model family than the driver, run read-only. State which one. If none
   available or config says `reviewer: none`, state the pass is skipped and
   continue (don't block) — at deep tier that degradation is disclosed in the
   receipts, never silent.

   Send the standard prompt envelope from `reviewer-agents.md`: write the
   artifact (phase diff + the phase spec from `wiki/plan.md`) to a temp file and
   pass it per the **artifact-passing contract** there — never inline a diff
   into a double-quoted shell string; real diffs carry backticks, `$`, and
   quotes that break interpolation silently. Verify the reviewer exited 0 with
   non-empty output; a silent no-op is a *skipped* pass and is reported as such,
   not as a clean one. Reconcile; carry genuine disagreements to the taste
   batch (don't smooth them).

## Fix policy

- **Objective findings → fix automatically, now.** Security holes, type-safety
  violations, missing/weak tests, failing tests, broken edges, violated past
  learnings, runtime defects. Fix on the phase branch, commit, and after **any**
  fix re-run the phase gate + the scoped checks (typecheck, lint, the tests
  covering the diff) — never just the pass that raised the finding; a fix in one
  pass can break a pass that already ran. Don't ask permission to fix something
  broken. **Escape hatch:** a finding still red after 3 fix attempts stops the
  loop — invoke `forge-debug` for the root cause and surface it to the user.
  Never declare green to satisfy the loop.
  A finding whose fix would break Economy or Scope is refuted in one line instead
  (forge-principles rule 13).
- **Subjective findings → one batch at the end.** Genuine tradeoffs with no right
  answer (and any unreconciled reviewer disagreement) go into a single
  AskUserQuestion batch in the **Decision Brief** shape
  (`../forge/references/question-style.md`). Don't drip questions mid-pass. With no
  one to ask, take your recommended option on each and list them as assumptions.

## Learnings → wiki

For each non-trivial thing found and fixed, append to `wiki/learnings.md`: date,
phase, a **confidence `N/10`** (structural lesson 8–9, one-off quirk 2–3), **what
was found**, **how it was fixed**, and the **rule-to-remember** (phrased so
`forge-build` avoids it next time). Format per `../forge/references/wiki.md`;
link from `wiki/index.md`. A real incident also gets `wiki/notes/`; a contradicted
past learning is retired visibly (strike + why), never silently violated. **Tell
the user what you captured, in the same turn.**

Also prepend the structured **review record** line and its **receipts block** to
`wiki/learnings.md` — the audit trail that lets a reader trust "green" without
replaying the review, and the source the next review's trend line, the re-run
fingerprint check, and `forge-retro`'s deltas all read. Without it the trend is
unfalsifiable. Exact format and required lines: `references/re-review.md`.

**Calibration.** At review start, check whether a previously green, shipped phase has
since been hotfixed or reverted on base, and append a `review-miss` learning for each
(procedure in `references/re-review.md`).

## Evidence chain

Number every finding (`finding-001`, …) and keep the number through fix and
re-verify. Visual findings get `finding-001-before.png` / `-after.png`; others paste
command output inline.

## Hand off — the terminal command block is the pass condition

Review ends with one final command block, run as-is, **its raw output pasted into
the review report**:

```
<phase gate> && <typecheck> && <lint> && <tests: scoped, or full when fast or shared code changed>
```

Substitute the project's real commands. **No pasted output, no hand-off**: a
described "all green" is a claim, not a state. Then report the summary — scope
verdict, completion checklist, passes run, findings fixed by severity (trend vs.
the previous review record, per `../forge/references/scoring.md`), learnings
recorded, open taste decisions — and hand to **`forge-ship`**. Never ship from here.
The last line is the result from `../forge/references/headless.md`
(`FORGE_RESULT {"skill":"forge-review","status":"done","phase":N,"gate":"green",…}`).

## Rules

- Loop fixes until clean or the 3-attempt escape fires; unfixed objective findings
  without an escalation mean the review is unfinished.
- Fix on the phase branch, never base; never ship here.
- Record learnings every pass that found something, and say so.

## References

- `references/review-standards.md` — what each pass checks, in depth
- `references/re-review.md` — fingerprints, delta re-review, receipts template, miss detection
- `references/strictness.md` — per-language strict-mode + banned-escape-hatch matrix
- `../forge/references/reviewer-agents.md` — reviewer selection, invocation, prompt envelope
- `../forge/references/question-style.md` — Decision Brief format for the taste batch
- `../forge-principles/references/simplicity.md` — economy of means + the simplicity pass
