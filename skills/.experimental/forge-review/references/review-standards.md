# Review standards — what each pass checks, in depth

Companion to `forge-review/SKILL.md`. The SKILL lists the passes; this defines the
bar for each. Every finding gets a severity: **critical** (exploitable / data loss /
silently wrong) · **high** (incorrect under realistic conditions) · **medium**
(fragile / will bite later) · **low** (polish). Critical/high/medium objective
findings are auto-fixed and re-verified; low is fixed if cheap, else logged to
`wiki/improvements.md`.

## 0. Scope & completion audit

**Scope drift.** Extract the phase's stated intent (its Goal + Work bullets in
`wiki/plan.md`, plus the phase branch's commit messages). Run
`git diff <base>...HEAD --stat` and classify every touched file against the
intent. Output one verdict with citations:

- `CLEAN` — every file traces to the spec.
- `DRIFT DETECTED` — name each out-of-scope file and what it changes. Drift is
  surfaced, never silently accepted: small adjacent fixes can stay (note them);
  unrelated feature work is a finding (move it to its own phase/branch).
- `REQUIREMENTS MISSING` — name each spec'd item with no corresponding change.

**Plan completion.** Turn the phase's Work bullets + gate into a checklist
(every actionable item, not a sample). For each item, first classify *how* it
can be verified, then verdict it:

- **DIFF-VERIFIABLE** — visible in the diff. Verify by reading the change.
- **RUNTIME** — needs the thing executed (covered again in pass 5, but the
  verdict lands here).
- **EXTERNAL-STATE** — lives outside the repo (a deployed config, a third-party
  dashboard, an OAuth app). Verify what you can from the machine; anything you
  can't gets `[UNVERIFIABLE]` plus the exact manual check the user should run.

Verdicts: `[DONE]` (clear evidence — cite file/line or output) · `[PARTIAL]`
(some of the behavior, not all — say which half) · `[NOT DONE]` · `[CHANGED]`
(implemented differently than spec'd — fine if argued, a finding if silent).
**Be conservative with DONE.** A file being touched is not evidence; the
specific behavior described must be present.

## 1. Security & abuse

- **Trust boundaries:** every input crossing one (HTTP, CLI args, env, files, DB,
  another service, LLM output) is validated and typed before use. LLM output is
  untrusted input — never `eval`/exec/SQL-interpolate it.
- **Injection:** parameterized queries only; no string-built SQL/shell; no
  `dangerouslySetInnerHTML`/template injection with untrusted data; path traversal
  guarded; prompt-injection considered where untrusted text reaches a model.
- **Secrets:** none in code, tests, fixtures, logs, or error messages. Loaded from
  env/secret store, validated at a fail-fast boundary.
- **AuthZ:** every privileged action checks authorization at the server/trust side,
  not the client. No "hidden = secure".
- **Dependencies:** new deps are reputable and necessary; no obviously abandoned or
  typosquat-looking packages; lockfile updated.

## 2. Tests — written and green

- Each behavior the phase added has a test that **fails if that behavior regresses**.
  Delete-the-line test: if you delete the implementation line, a test must go red.
- Error and edge paths are tested, not just the happy path.
- No skipped/`.only`/commented-out/flaky tests sneaking through. Skipped == failing.
- The **full** suite runs and passes — show the command and the summary line. A
  phase whose suite is red or whose new code is untested does not pass review.
- Tests assert behavior/outcomes, not implementation detail mirrors. Coverage
  numbers are not the goal; meaningful failure on regression is.

## 3. Strict type safety

Per `references/strictness.md`. Type check + lint must be green and shown. Every
escape hatch is a finding unless it carries the justified, narrow comment defined
there. Prefer fixing the type over suppressing the error — always.

## 4. Correctness & edges

- Inputs: nil/None/null, empty, zero, negative, huge, wrong type, malformed.
- Concurrency: shared state, ordering assumptions, double-submit, partial failure
  mid-sequence, retry/idempotency.
- Resources: files/sockets/handles closed; no unbounded growth; timeouts on I/O.
- Errors: handled at the layer that can act on them; never silently swallowed; the
  user/caller sees a truthful, actionable signal (no silent empty success).
- State: transactions atomic; no write-then-fail leaving partial state.

## 5. Runtime verification (absorbs the old forge-qa)

Static review is not enough — run the thing.

- Execute the phase's **verifiable gate** verbatim; show it green.
- Exercise the phase **goal** as a user would:
  - **UI:** drive the critical path with the project's e2e tooling or browser
    automation; check loading / empty / error / success states; capture evidence.
  - **CLI / library:** run real commands / call the API with real *and* adversarial
    inputs (empty, wrong type, huge, concurrent); check stdout/stderr/exit codes.
  - **Data / pipeline:** verify against the real store/output — counts, shape, a
    representative query, idempotency on re-run.
- A gate that is green while the goal is unmet ⇒ the gate is too weak: fix the gate
  in `wiki/plan.md` (and note why) — that is a high-severity finding, not a pass.

## 6. Codex third-party pass

Optional, never blocking. Use it as an adversary, not a rubber stamp. Where Codex
and this review disagree, surface the disagreement explicitly in the taste batch
with both positions and a recommendation — never silently average them away.

## Severity → action

| Severity | Objective | Subjective |
|---|---|---|
| critical / high | auto-fix now, re-verify, loop until clean | surface in end batch with a strong recommendation |
| medium | auto-fix now | surface in end batch |
| low | fix if cheap; else log to `wiki/improvements.md` | mention briefly |

A review pass that found something always writes a `wiki/learnings.md` entry with
the rule-to-remember, so the lesson compounds instead of recurring.
