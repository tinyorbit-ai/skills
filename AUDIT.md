# Forge suite audit — 2026-07-01

Audited: all 23 `skills/forge*` skills + the 10 shared references under `skills/forge/references/`,
against the owner's spec: high-quality software (simplicity, maintainability, scalability), an
always-up-to-date comprehensive wiki (not just ADRs), brief-or-sentence → hardened phased plan,
resumable via re-running `/forge`, per-task cycles (design shotgun via served HTML; build → review),
and ship ensuring all green before merging back. Method: 5 parallel cluster auditors + direct reads
of the orchestrator, ship, wiki spec, and charter; all load-bearing citations spot-verified.

**Verdict: the philosophy layer (charter, simplicity.md, wiki spec) is strong; output quality dies
in the wiring. The repeated pattern is aspiration substituted for mechanism — the highest-leverage
behaviors are exhortations with no trigger, no owner, no verification artifact, and no worked
example.**

---

## Findings by requirement

### 1. Design shotgun — never fires on the auto-path, and its output is never consumed

- **Design is absent from the resume ladder.** `forge/SKILL.md:74-85` routes plan → harden → lock →
  build; `forge-plan/SKILL.md:114-123` only *recommends* design-system/design-explore at hand-off.
  The next `/forge` run jumps to harden; the recommendation evaporates.
- **`forge-build` and `forge-review` never read DESIGN.md** (verified: zero grep matches). Build's
  mandatory reads (`forge-build/SKILL.md:18-26`) omit it. The locked design dies in the wiki.
- **Anti-slop blacklist exists only post-build** (`forge-polish/SKILL.md:40-54`); design-explore and
  design-system never reference it — slop can be generated, picked, and locked as the direction.
- **Polish is a single self-graded pass with no exit bar** (`forge-polish/SKILL.md:60-73`).
- **ASCII escape hatch** (`forge-design-explore/SKILL.md:56-59,82`): "no browser reachable" lets a
  headless run skip rendered HTML for visual surfaces; the serve step is a soft "prefer"
  (`design-feedback-board.md:38-41`).
- forge-init injects no design discipline into CLAUDE.md; nothing forces variants to differ on a
  real axis; feedback-board contract duplicated across three files.

### 2. Ship green gate — verifies less than it claims

- **Nothing re-runs on base after squash-merge** (`forge-ship/SKILL.md:41-58`). Base movement
  (docs: commits, parallel phases per `branch-discipline.md:9-10`) lands unverified.
- **"Green" = only the phase's gate string.** No independent typecheck/lint/full-suite at ship;
  those live only in forge-review, which self-attests.
- **Review's green is a described end-state, not a forced terminal command**
  (`forge-review/SKILL.md:108-111,139-141`); auto-fixes re-run only "the affected pass".
- **No merge-conflict path in ship; no non-convergence escape in review's fix loop** — the two
  base-corrupting failure modes are left to improvisation.
- The `docs:` follow-up commit lands on base ungated (`forge-ship/SKILL.md:90-94`).

### 3. Hardening — self-graded and structurally additive

- **Rate→fix-to-10→re-rate has no ground truth** (`scoring.md:1-35`): same actor scores, fixes,
  re-scores; deltas are "proof of work" (movement-biased); the third-party reviewer
  (`reviewer-agents.md:42-57`) sees only the post-fix plan and never validates deltas.
- **Additive by construction**: economy lives in forge-harden-eng which runs FIRST
  (`forge-harden/SKILL.md:100-108`) and never re-runs; scope TRIM is opt-in; dx's hosted-sandbox
  "magical moment" (`forge-harden-dx:85-87`) contradicts simplicity.md's default-deny with no
  resolver. Hardened plans get heavier.
- **No persona-vs-persona reconciliation** (`forge-harden:124-128` covers reviewer-vs-persona
  only); four personas edit the same gates, last-writer-wins.
- **Orchestration mechanism unspecified** → ~1,500 lines of skill instructions stack in one
  context; every persona re-reads the same wiki files; late passes run degraded.
- **`--auto` single-objector hole** (`forge-harden:41-43`): one persona objecting to a
  user-chosen direction → Taste → auto-decided against the user. No hard always-surface allowlist.
- Adversarial reviewer invocation pastes the full plan into a double-quoted shell arg
  (`reviewer-agents.md:15,54-57`) — quoting breakage, no output verification.
- Objective-vs-taste and Mechanical/Taste/User-Challenge are two vocabularies with no crosswalk
  and no worked boundary examples.

### 4. Wiki — write-once, front-loaded, starved

- **`architecture.md` has no owner.** Promised "filled as phases land" in four places
  (`forge-init/SKILL.md:43`, `templates.md:25,95,261`, `wiki.md:31`); written once by forge-plan
  (`:52`); no writer in build/review/ship/debug/retro (grep-verified). Template mandates it
  trivial ("30-second version") so it can't carry maintainability/scalability reasoning.
- **`forge-wiki-maintain` is never auto-invoked** — indexes and health checks only run if the user
  remembers. Index freshness rests on unverified "update index.md in the same change" asks in five
  skills.
- **`knowledge/` is empty by default** — only user-initiated ingest feeds it; discovery/plan/harden
  deposit nothing; discovery discards its source documents after compressing to the brief.
- **Spec duplicated four ways, already diverging**: `templates.md:123-127` learnings example omits
  the `confidence N/10` field `wiki.md:87-98` mandates and `health.md:58` checks; `ingest.md:64`
  adds a fifth timeline verb.
- **`.forge/config.yaml` + `taste.md` documented and read by four skills but never scaffolded by
  forge-init.**
- **Unsourced ceremony**: forge-review's trend line (`forge-review:143`) and forge-retro's score
  deltas read a structured per-phase review record that nothing writes (only harden-time personas
  write `## Review` blocks). `scoring.md:49-51` describes a store that doesn't exist at runtime.
- Ambient capture (`templates.md:271-297`, `wiki.md:186-201`) is pure exhortation — biggest
  freshness lever, zero enforcement. `brief.md` has no update story. ADR numbering has no
  next-number procedure (parallel personas can collide). forge-docs writes `wiki/index.md` without
  checking `wiki/` exists.

### 5. Brief → plan — form without substance checks

- **Gates can legally be vacuous**: `forge-plan:99-104` accepts `typecheck && lint && test` for any
  phase; nothing ties the gate to the phase goal's observable.
- **Maintainability and scalability are unencoded** — no lens, ADR prompt, or architecture
  criterion anywhere; only simplicity is operationalized.
- **Approaches ritual is pre-decided**: A is defined "fewest moving parts" and the rule says
  "default to the simplest" (`forge-plan:33-41`); lateral option optional; no material-difference
  test — the ADR's alternatives are post-hoc strawmen.
- **One-sentence path is an unbudgeted 13-question interrogation** (~8-15 turns), with overlapping
  questions (who/when ≈ specific-moment; hard-part ≈ drawn-to) and only a soft skip rule
  (`forge-discovery:102`). Doc-seeded path has a governor (`:46-54`); the one-liner path doesn't.
- **Phase-1 walking skeleton mandated but un-exampled/unverified** (`forge-plan:78-80`).
- **Parts list has no persistence target** and "a part with no reason gets cut" is unenforceable
  (`forge-plan:54-57`).
- **Charter leak**: "Don't reduce scope to make it 'more shippable' — that's the gatekeeping forge
  rejects" (`forge-plan:138`) conflates value-gatekeeping with engineering-soundness trims, while
  ambition pressure auto-runs upward (forge-ambition auto; scope TRIM opt-in).

### 6. Build quality

- **"Staff engineer" is prose with no build-time gate** (`forge-build:39-66`): no pre-hand-off
  checklist, no test-first mandate, no size thresholds; strictness punted to review (`:84`).
- **Scope drift only detected post-build** at review pass 0; in-build guard is honor-system
  (`forge-build:43-45`).
- **forge-review is overloaded past one context window** (8 passes + polish + dx + third-party +
  fix loop + evidence artifacts, `forge-review:31-104`) — runtime verification and test rigor are
  the first things silently summarized instead of done. Evidence chain + before/after PNGs
  (`:130-136`) are unenforced ceremony.
- Learnings are append-only unbounded prose; confidence scores self-assigned and never consumed.

### 7. Resumability — mostly sound

Stop-and-report per phase, persisted `Lock status:` marker, and re-entry guards work. Weak spots:
stringly-typed state markers (undefined "stub" detection; `## Review` presence = hardened), and the
missing design row in the ladder (§1).

---

## Root causes, ranked

1. **Aspiration without mechanism** — the highest-leverage behaviors have no trigger, artifact, or
   verification; unguarded instructions degrade to narrated compliance.
2. **Self-graded verification everywhere** — scores, confidence, evidence, "suite is green" all
   produced and consumed by the same actor; the one independent reviewer never sees the deltas.
3. **Ownership gaps** — artifacts with creation stories and no updater (architecture.md, brief.md,
   taste.md, indexes, config.yaml); a design cycle with no owner in the router.
4. **Additive bias** — ambition auto-runs, trim is opt-in, economy runs first and never re-runs.
5. **Zero worked examples across ~3,100 lines** — every quality bar is abstract; models fill the
   form with plausible-generic substance. Likely the single biggest output-quality lever.
6. **Monolithic overloaded contexts** — forge-review and forge-harden stack too much in one window;
   expensive verification work drops first.

## Highest-ROI fixes, in order

1. **Ship**: re-run gate + full typecheck/lint/suite on base HEAD after squash; add conflict path
   (abort → rebase → re-gate → retry); gate the `docs:` commit.
2. **Review**: mandatory terminal command block (full gate+suite+typecheck+lint, pasted output =
   pass condition); full re-run after any auto-fix; N-attempt escape to forge-debug.
3. **Wire DESIGN.md**: mandatory forge-build read; objective forge-review pass (grep off-system
   values); forge-init CLAUDE.md injection.
4. **Real design cycle**: plan enumerates UI surfaces (explore / follow-system / trivial); ladder
   row gates UI phases on a locked direction (mirror plan-lock); kill the ASCII hatch for visual
   surfaces; exact serve recipe.
5. **architecture.md ownership**: forge-ship reconciles it every phase; expand template;
   add maintainability + scalability as named lenses in plan/architecture.
6. **Invert harden**: economy sweep runs LAST with authority to cut; third-party reviewer grades
   before/after diff + claimed deltas; personas as isolated subagents off one shared read;
   persona-conflict reconciliation; close the --auto single-objector hole with an always-surface
   allowlist.
7. **Goal-anchored gates**: gate must assert the phase goal's observable; generic CI necessary,
   never sufficient; add good/bad worked examples (brief, phase-1 slice, gate, variants).
8. **Un-starve the wiki**: auto-run `forge-wiki-maintain --fix` at ship/retro; discovery/harden
   deposit sources into knowledge/; init scaffolds `.forge/config.yaml` + `taste.md`; single-source
   the wiki spec; fix the learnings-format contradiction; forge-review persists the structured
   per-phase review block that retro/trends read.
9. **Shared slop blacklist** enforced at generation time in design-explore/design-system; polish
   gets an exit bar and loops until met.
10. **Charter clarification**: "too large to build well" is engineering judgment, not gatekeeping.

Note: untracked `skills/.experimental/adversarial-review/` looks like an in-flight independent-
reviewer mechanism — fixes 2 and 6 are where it should land.
