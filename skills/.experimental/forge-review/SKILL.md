---
name: forge-review
description: Staff-grade review of a freshly built phase — security, high-quality tests written and all passing, strict type safety with escape hatches banned, runtime verification of the gate and goal, plus an optional third-party adversarial pass (Codex, Gemini, or Claude per config). Auto-fixes every objective finding, surfaces only genuine taste decisions, and records lessons in the wiki. Use after forge-build, when asked to "review this", "review the phase", "security and quality review", or as the review step of the forge loop.
metadata:
  internal: true
---

# forge-review

The quality gate between building a phase and shipping it. Folds in the gstack
review principles: security, real tests, strict types, third-party eyes — then
**fixes what it finds** and remembers the lesson. Also does the runtime
verification that the old `forge-qa` did (this skill replaces it). The
third-party pass is configurable — Codex, Gemini, or Claude — via the shared
reviewer abstraction (`forge/references/reviewer-agents.md`).

## Charter

The project is worth building and worth getting right. Review hardens the *code*,
never the premise. The bar is correctness, safety, and durability — never market or
speed. Never conclude "don't build this".

## Scope

Review the **current phase's diff** against the base branch (`git diff <base>...HEAD`
on the phase branch) plus anything that diff touches. Read `wiki/learnings.md`
first — its rules are mandatory and enforced here; a violation of a past learning is
a high-severity finding.

## The passes (run all; details in `references/review-standards.md`)

1. **Security & abuse.** Trust boundaries, input validation, authz, secrets, injection
   (SQL / command / LLM-prompt / path), unsafe deserialization, dependency risk,
   anything touching untrusted input. Severity-tag every finding.
2. **Tests — written and green.** Every behavior the phase added has a meaningful
   test that would fail if the behavior regressed (not coverage theater). The full
   suite **passes** — run it, show it. Missing/weak tests are a finding to fix, not
   note. Flaky or skipped tests count as failing.
3. **Strict type safety.** Enforce the project's strictest setting; escape hatches
   **banned**. For TypeScript: `strict: true`, no `any` (explicit or implicit), no
   unchecked `as`, no `@ts-ignore`/`@ts-expect-error` without a justified comment, no
   non-null `!` on untrusted values. Equivalent rules per language in
   `references/strictness.md`. Type check must pass clean.
4. **Correctness & edges.** Nil/empty/overflow/timeout/concurrent/partial-failure
   paths; idempotency; error propagation at the right layer; resource leaks.
5. **Runtime verification (was forge-qa).** Actually run it: execute the phase's
   verifiable gate and show it green, then exercise the phase **goal** like a real
   user (UI: drive the flow incl. loading/empty/error states; CLI/lib: real +
   adversarial inputs; data: verify against the real store). A gate that passes
   while the goal is unmet is itself a high-severity finding.
   - If the phase diff **touched UI**, invoke **`forge-polish`** here (designer's-eye
     pass on the running screens). Its objective fixes fold into this review.
   - If the build is **developer-facing** (CLI/API/SDK/lib), invoke **`forge-dx`**
     here (live onboarding/TTHW/error-message audit). Same: objective fixes fold in.
   - Both are scoped to what the phase changed and skip cleanly if out of scope.
6. **Optional third-party adversarial pass.** Resolve the reviewer per
   **`forge/references/reviewer-agents.md`** — explicit `wiki/.forge/config.yaml`,
   then `$FORGE_REVIEWER`, then auto-probe `codex` → `gemini` → `claude`. State
   which one was picked and why. If none available or config says
   `reviewer: none`, state the pass is skipped and continue (don't block).

   Send the standard prompt envelope from `reviewer-agents.md` with the
   artifact = phase diff (`git diff <base>...HEAD`) + the phase spec from
   `wiki/plan.md`. Example invocation when Codex is resolved:

   ```
   codex exec --skip-git-repo-check "$(cat <<'EOF'
   You are an adversarial reviewer of a freshly built phase. Find: (1) the
   weakest point, (2) the most likely missed failure / regression, (3) any test
   that would PASS through a real regression. Severity-tag each finding
   (high/med/low) and propose a one-line fix. Be specific. Do not comment on
   whether the project is worth building.

   <<<
   $(git diff <base>...HEAD)

   --- PHASE SPEC ---
   $(sed -n '/^## Phase <n>/,/^## Phase /p' wiki/plan.md)
   >>>
   EOF
   )"
   ```

   Swap `codex exec --skip-git-repo-check` for `gemini -p` or `claude -p` when
   the resolver picks those. Reconcile; carry genuine disagreements to the
   taste batch (don't smooth them).

## Fix policy

- **Objective findings → fix automatically, now.** Security holes, type-safety
  violations, missing/weak tests, failing tests, broken edges, violated past
  learnings, runtime defects. Fix on the phase branch, commit, and **re-run the
  affected pass until clean**. Loop until every objective finding is resolved and
  the full gate + suite are green. Don't ask permission to fix something broken.
- **Subjective findings → one batch at the end.** Genuine tradeoffs with no right
  answer (and any unreconciled reviewer disagreement) go into a single
  AskUserQuestion batch in the **Decision Brief** shape (forge suite's
  `references/question-style.md`): concrete framing, named stakes,
  recommendation with the *why* and the evidence that would flip it. Don't
  drip questions mid-pass. Take a position on each; anti-sycophantic throughout.

## Learnings → wiki

For each non-trivial thing found and fixed, append to `wiki/learnings.md`: the date,
the phase, **what was found**, **how it was fixed**, and the **rule-to-remember**
(generalizable, phrased so `forge-build` avoids it next time). Link from
`wiki/index.md`. If a finding was a real incident/surprising root cause, also write
`wiki/notes/`. **Tell the user what you captured, in the same turn.**

## Hand off

When every objective finding is fixed, the full gate + test suite are green, types
are clean, and taste decisions are resolved: report the review summary (passes run,
findings fixed by severity, learnings recorded, open taste decisions if any) and
hand to **`forge-ship`** to land the phase. Never ship from here.

## Rules

- Auto-fix objective; surface only true taste. Loop fixes until clean — a review
  that lists unfixed objective findings is unfinished.
- Evidence for every "green": show the command output, not a claim.
- Strict-types escape hatches are banned, not negotiated.
- Respect branch discipline: fix on the phase branch, never base; never ship here.
- Record learnings every pass that found something, and say so.

## References

- `references/review-standards.md` — what each pass checks, in depth
- `references/strictness.md` — per-language strict-mode + banned-escape-hatch matrix
- forge suite's `references/reviewer-agents.md` — reviewer selection, invocation, prompt envelope
- forge suite's `references/question-style.md` — Decision Brief format for the taste batch
