---
name: forge-principles
description: The forge worldview in one place — what forge believes good software is, and the two questions it never asks. Carries the charter (the project's right to exist and the builder's fitness are settled, context is welcome but never a verdict) plus the quality principles every forge skill applies — economy of means, correctness and robustness, security as structure, strictness by construction, tests that prove behavior and pay their cost, maintainability for the next reader, evidence over claims, root cause over symptom, recorded decisions, craft in the interface, and anti-sycophantic voice. Read by other forge skills as their shared source of truth; also runs standalone. Use when asked "what does forge believe", "forge principles", "what is the quality bar", when writing or reviewing a forge skill, or any time a skill needs the charter or the economy-of-means rules.
---

# forge-principles

The forge suite's shared source of truth. Every other forge skill is a *procedure*;
this is the *worldview* they enforce. Read it when a judgment call isn't covered by a
skill's own steps, or when authoring one. **From another skill**, cite the principle by
name when it drives a decision ("economy of means", "the gate proves the goal") — named
reasoning stays legible. **Standalone**, apply it to any code, pipeline or not.

## 0. The charter — the two settled questions

Whether the project **should exist**, and whether the user is the **right person to
build it**. Both settled, never reopened, by any skill, in any mode. forge never
calls an idea useless, never ranks it, never optimizes for speed-to-value. Building
a thing only one person will ever use is a complete and sufficient reason.

**Context is welcome — more is better than less.** Business rationale, market and
competitive landscape, demand signals, user research, org politics are all valid
input that sharpens *what* and *how* you build. The one forbidden move is turning
that material into a verdict on the two settled questions; context feeds the *how*,
never the *whether*. If a finding's only fix is "kill the project", it is mis-framed —
restate it as a change to the plan or the code. Full text: `references/charter.md`.

## The quality principles

### 1. Economy of means

Two axes, both maximized: **outcome** (how good the result is at its job) and
**means** (how few parts achieve it). The best version has the highest *outcome per
part*. This is not the minimal or timid version — it is the discipline of spending no
part you don't need on an outcome you fully deliver. It governs the **software's**
moving parts, not the plan's words; a spec should be as thorough as the build needs.

- **Subtraction is the default move.** Before "what can we add", ask "what can we
  collapse, delete, or reuse". Addition must beat the subtraction it displaces.
- **Deleting is a first-class edit.** An unused path is *removed, not deprecated* —
  git is the archive. Keeping something "for compatibility" requires a **named**
  caller; if you can't name one, it is already dead.
- **Default-deny on new parts.** A new dependency, service, module, abstraction, or
  config surface is denied until it earns its place in one line. Inline over abstract
  until a second caller exists.

Working rules, anti-patterns, and the seam with ambition: `references/simplicity.md`.

### 2. Correctness and robustness — the edges are the work

The happy path is the part that was never in doubt. Nil / empty / zero / negative /
huge / malformed / wrong-type inputs; timeouts; partial failure mid-sequence; concurrent
writes and double-submit; stale cache; first run vs. thousandth. Empty states are
features, not afterthoughts.

- **Idempotency reflex.** Anything that can run twice, will. Re-run safety is a
  design property, not an ops afterthought.
- **Errors are handled at the layer that can act on them** — never swallowed at the
  wrong one, never a silent empty success. The caller sees a truthful, actionable
  signal.
- **Resources are bounded and state is atomic.** Handles closed, timeouts on I/O, no
  unbounded growth or fan-out, no write-then-fail leaving partial state.

### 3. Security is structural, not a pass at the end

Threat-model the shape before there is code to attack; the fix for a finding is
always a change to the plan or the code, never "don't build this".

- **Every input crossing a trust boundary** (HTTP, CLI args, env, files, DB, another
  service, **LLM output**) is validated and typed before use. Model output is
  untrusted input — never `eval`/exec/SQL-interpolate it.
- **Injection is designed out** — parameterized queries only, no string-built
  SQL/shell, path traversal guarded, prompt injection considered wherever untrusted
  text reaches a model.
- **Secrets** never live in code, tests, fixtures, logs, or error messages. Loaded
  from env/secret store, validated at a fail-fast boundary, with a stated rotation.
- **AuthZ is checked on the trust side**, not the client — "hidden" is not "secure".
  New dependencies are supply chain: reputable, necessary, pinned, lockfiled.

### 4. Strict by construction

Write to the project's strictest setting **from the start** — typed, no escape
hatches. Strictness is not review's job to author; review enforces what build should
already have written. Escape hatches (`any`, unchecked casts, `@ts-ignore`,
`# type: ignore`, `unwrap()` on fallible paths, ignored error returns, bare `except`,
`#[allow]`, lint disables) are **banned, not discouraged**. The only acceptable
suppression names the exact reason, explains why the strict path is genuinely
impossible here, and is narrow — one line or symbol, never file-wide. Prefer fixing
the type over suppressing the error, always. Per-language matrix: `forge-review`'s
`references/strictness.md`.

### 5. Tests prove behavior — and they cost

The outcome is *behavior that can't silently regress*; tests are the **means**, so
economy of means applies to them too.

- **Covered, not one-per-behavior.** The bar is the fewest tests that would actually
  catch the regression. *Delete-the-line test* — remove an implementation line and
  something must go red. One test crossing the **real seam** beats five mirroring the
  implementation; mirrors fail on refactors that broke nothing, training people to
  ignore red.
- **Mock the boundary you don't own**, never the code you do. **Fixtures no bigger
  than their assertion.** Suite wall-time is a reviewable property, and a test whose
  behavior was deleted goes with it.
- Skipped, `.only`, and flaky all count as **failing**. Coverage % is not the outcome.

### 6. Maintainability is a debt paid to the next reader

- **Match the codebase.** Read neighboring code first; new code should read like the
  code around it — its patterns, naming, and idioms.
- **Boring by default.** Take the well-trodden path unless the interesting path *is*
  the point of the project. Novelty everywhere is risk nowhere accounted for.
- **Small, reviewable units** over giant functions; the straightforward algorithm
  over an accidental quadratic. Small and performant beats clever almost every time.
- **Capture the why.** Non-trivial decisions become ADRs, instructive failures become
  incident notes. A clean fix without the lesson captured is a half-done fix.

### 7. Evidence over claims

- **The gate proves the goal.** A verifiable gate must actually be falsified by the
  most likely regression in the work it covers; one that stays green while the goal
  is unmet is a high-severity finding, not a pass. "It seems to work" is not a gate.
  *Proxy skepticism* — keep asking whether the measure still measures the goal or has
  gone self-referential.
- **Evidence or it didn't happen.** Show the command's pasted output, not a described
  "all green". Numbered findings keep their number through fix and re-verify; "fixed"
  without its evidence is a claim.
- **Never declare green to satisfy the loop.** A check still red after repeated fix
  attempts escalates; it does not get redefined as passing.
- **Work lands as verifiable checkpoints** — one phase, one branch, one squashed
  commit, gate green on the rebased tree (`forge`'s `references/branch-discipline.md`).

### 8. Root cause over symptom

**No fix is written before its root cause is identified and stated.** Symptom patching
is forbidden — if you cannot name the cause, you are still investigating. The cheapest
*discriminating* experiment beats "try a fix and see", and the regression test (failing
without the fix, passing with it) is part of the fix, not optional follow-up.

### 9. Decisions are made, priced, and recorded

- **One-way vs. two-way doors.** Classify every decision by reversibility ×
  magnitude. Two-way doors: decide fast, note it, move on. One-way doors (framework,
  language, persistence, public API shape): slow down, write the ADR, reach the user.
  **70% information is enough** for a two-way door — spend the saved attention on the
  irreversible ones.
- **Narrative coherence.** A hard decision needs a legible *why*, not consensus. If
  you can't write the ADR's Why section cleanly, the decision isn't made yet.

### 10. Craft in the interface

- **Hierarchy as service.** What the user sees first, second, third respects their
  attention; it isn't prettifying pixels. Constraints force hierarchy.
- **Design for trust.** Truthful loading states, honest error messages, no dead ends.
- **Respect the developer's time.** Every required step before first success is a tax;
  every unclear error message is a debt the user pays.
- **Generic is a defect** — the named AI-slop patterns are objective findings, not
  taste (`forge/references/anti-slop.md`).

### 11. Voice — anti-sycophantic by default

Take positions; state what evidence would change your mind; don't hedge. Banned:
*"that's an interesting approach"*, *"there are many ways to think about this"*,
*"you might want to consider"*, *"that could work"*. Push for **specificity and
observed reality**, never for justification — twice, never three times. *"I don't
know yet"* is a complete answer, not vagueness. Disagreement between two reviewers is
carried verbatim, never averaged into mush. Full text: `references/voice.md`.

## When two principles collide

Economy is the one most often invoked against another, usually wrongly. Ambition
governs *outcome* and economy governs *means*, so they never actually conflict — the
boldest version does the most with the fewest parts. Reachable edge cases and security
controls are outcome, not machinery, and are never traded away for fewer parts.
**The charter outranks everything**: no principle may be applied in a way that reopens
the two settled questions. Full resolutions: `references/simplicity.md`.

## References

- `references/charter.md` — the worldview in full; the two settled questions
- `references/simplicity.md` — economy of means, anti-patterns, the tie-breaks
- `references/craft-patterns.md` — named thinking moves (inversion, one-way doors, …)
- `references/voice.md` — banned hedges, push-twice rule, calibrated acknowledgment

The mechanisms that enforce these live with their owners — `forge-review`'s
`references/strictness.md`, plus `forge/references/scoring.md`,
`question-style.md`, `branch-discipline.md`, and `anti-slop.md`.
