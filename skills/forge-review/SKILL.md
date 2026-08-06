---
name: forge-review
description: Staff-grade review of a freshly built phase — security, high-quality tests written and all passing, strict type safety with escape hatches banned, runtime verification of the gate and goal, plus a third-party adversarial pass (Codex, Gemini, or Claude per config; required at deep tier). Triages review depth to the diff, fingerprints the phase diff so re-runs audit prior findings and review only the delta, appends an auditable receipts record, and tracks its own misses (shipped phases later hotfixed) as calibration. Auto-fixes every objective finding, surfaces only genuine taste decisions, and records lessons in the wiki. Use after forge-build, when asked to "review this", "review the phase", "security and quality review", or as the review step of the forge loop.
---

# forge-review

The quality gate between building a phase and shipping it. Security, real tests,
strict types, runtime verification, third-party eyes — then **fixes what it
finds** and remembers the lesson. The third-party pass is configurable — Codex,
Gemini, or Claude — via the shared reviewer abstraction
(`forge/references/reviewer-agents.md`).

## Charter

Review hardens the *code*, never the premise — the bar is correctness, safety, and
durability, never market or speed; never conclude "don't build this"
(`forge-principles`'s `references/charter.md`).

## Scope

Review the **current phase's diff** against the base branch (`git diff <base>...HEAD`
on the phase branch) plus anything that diff touches. Read `wiki/learnings.md`
first — its rules are mandatory and enforced here; a violation of a past learning is
a high-severity finding. When a learning drives a finding or a check, say so
visibly: `Prior learning applied: <rule> (from <date>, phase <n>)` — the
compounding should be legible, not silent.

Re-runs are idempotent (`references/re-review.md`): an unchanged fingerprint whose
record ended green is reported, not replayed; a changed one gets a **re-review** —
prior findings audited first (resolved / still open), then the delta since the last
reviewed HEAD. The terminal command block always runs in full either way.

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
2. **Tests — covered, green, and no heavier than they need to be.** Every behavior
   the phase added is **covered** by a test that goes red if it regresses. Covered,
   not one-test-each: one test crossing the real seam beats five mirroring the
   implementation, and the bar is the *fewest* tests that would actually catch it.
   Missing/weak coverage is a finding to fix, not note. The full suite **passes** —
   run it, show it; flaky or skipped count as failing. Test **cost** is reviewable
   too: a phase that materially slows the suite, mocks what could have been real,
   or ships fixtures far larger than their assertions is a finding, same as one
   that under-tests (`references/review-standards.md`).
3. **Strict type safety.** Enforce the project's strictest setting; escape hatches
   **banned**. For TypeScript: `strict: true`, no `any` (explicit or implicit), no
   unchecked `as`, no `@ts-ignore`/`@ts-expect-error` without a justified comment, no
   non-null `!` on untrusted values. Equivalent rules per language in
   `references/strictness.md`. Type check must pass clean.
4. **Correctness & edges.** Nil/empty/overflow/timeout/concurrent/partial-failure
   paths; idempotency; error propagation at the right layer; resource leaks.
5. **Economy & performance — the whole diff, tests included.** Objective and
   auto-fixable: collapse pass-through layers, inline premature abstractions
   (single caller), delete unused extension points, reject speculative config,
   prefer an existing path over a new parallel one, split giant functions, replace
   an accidental quadratic with the straightforward algorithm.
   - **Tests are not exempt.** Duplicate assertions of an already-covered behavior,
     implementation-mirror tests, mocks standing in for an object that could be
     real, and oversized fixtures are objective findings whose fix is **deletion**.
   - **Superseded code.** For every path this diff touched, ask what it made dead:
     the old branch, the now-unreferenced helper, the compat shim with no caller
     left, the test whose behavior is gone. Removing it is an objective fix, not a
     suggestion — and "keep it for compatibility" needs a *named* consumer, else
     it's an unexamined default (`forge-principles/references/simplicity.md`).

   The phase must be exactly what the plan asked — nothing more, nothing less, and
   nothing it obsoleted left standing. A simpler, faster, smaller diff that still
   passes the gate is a fix, not a suggestion.
6. **Runtime verification (was forge-qa).** Actually run it: execute the phase's
   verifiable gate and show it green, then exercise the phase **goal** like a real
   user (UI: drive the flow incl. loading/empty/error states; CLI/lib: real +
   adversarial inputs; data: verify against the real store). A gate that passes
   while the goal is unmet is itself a high-severity finding.
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
   Resolve the reviewer per **`forge/references/reviewer-agents.md`** — explicit
   `wiki/.forge/config.yaml`, then `$FORGE_REVIEWER`, then auto-probe
   `codex` → `gemini` → `claude`. State which one was picked and why. If none
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
- **Subjective findings → one batch at the end.** Genuine tradeoffs with no right
  answer (and any unreconciled reviewer disagreement) go into a single
  AskUserQuestion batch in the **Decision Brief** shape (forge suite's
  `references/question-style.md`): concrete framing, named stakes,
  recommendation with the *why* and the evidence that would flip it. Don't
  drip questions mid-pass. Take a position on each; anti-sycophantic throughout.

## Learnings → wiki

For each non-trivial thing found and fixed, append to `wiki/learnings.md`: date,
phase, a **confidence `N/10`** (structural lesson 8–9, one-off quirk 2–3), **what
was found**, **how it was fixed**, and the **rule-to-remember** (phrased so
`forge-build` avoids it next time). Format per forge suite's `references/wiki.md`;
link from `wiki/index.md`. A real incident also gets `wiki/notes/`; a contradicted
past learning is retired visibly (strike + why), never silently violated. **Tell
the user what you captured, in the same turn.**

Also prepend the structured **review record** line and its **receipts block** to
`wiki/learnings.md` — the audit trail that lets a reader trust "green" without
replaying the review, and the source the next review's trend line, the re-run
fingerprint check, and `forge-retro`'s deltas all read. Without it the trend is
unfalsifiable. Exact format and required lines: `references/re-review.md`.

**Calibration — the review's own misses.** At review start, check whether any
previously green-reviewed, shipped phase has since been hotfixed or reverted on the
base branch, and append a `review-miss` learning for each confirmed one — a
mandatory check in every future review (procedure in `references/re-review.md`).
The review gets measurably better, or the trend line shows it isn't.

## Evidence chain

Number every finding (`finding-001`, …) when raised and keep the number through fix
and re-verify. Visual/runtime findings get paired artifacts named by number
(`finding-001-before.png` / `-after.png`); non-visual ones paste command output
inline. "Fixed" without its numbered evidence is a claim, not a fix.

## Hand off — the terminal command block is the pass condition

Review ends with one final command block, run as-is, **its raw output pasted into
the review report**:

```
<phase gate> && <typecheck> && <lint> && <tests scoped to the diff>
```

Substitute the project's real commands; prefer the full suite — if it's too slow to
run here, that is itself a pass-2 finding. **No pasted output, no hand-off**: a
described "all green" is a claim, not a state. Then report the summary — scope
verdict, completion checklist, passes run, findings fixed by severity (trend vs.
the previous review record, per forge suite's `references/scoring.md`), learnings
recorded, open taste decisions — and hand to **`forge-ship`**. Never ship from here.

## Rules

- Auto-fix objective; surface only true taste. Loop fixes until clean or the
  3-attempt escape fires — unfixed objective findings without an escalation
  mean the review is unfinished.
- Evidence for every "green": show the command output, not a claim. The terminal
  command block's pasted output is the hand-off condition.
- Strict-types escape hatches are banned, not negotiated.
- Respect branch discipline: fix on the phase branch, never base; never ship here.
- Record learnings every pass that found something, and say so.

## References

- `references/review-standards.md` — what each pass checks, in depth
- `references/re-review.md` — fingerprints, delta re-review, receipts template, miss detection
- `references/strictness.md` — per-language strict-mode + banned-escape-hatch matrix
- forge suite's `references/reviewer-agents.md` — reviewer selection, invocation, prompt envelope
- forge suite's `references/question-style.md` — Decision Brief format for the taste batch
- `forge-principles`'s `references/simplicity.md` — economy of means + the simplicity pass
