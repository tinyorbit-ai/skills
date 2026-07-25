# Skills index

Every skill in this repo, what it does, and the non-obvious parts of how it works.
This is the routing/orientation map for humans and the orphan check for
`evals/static/validate.mjs` — it is deliberately **not** in `CLAUDE.md`, because
each skill's `description` frontmatter is already always in the agent's context and
the table would be ~2,200 tokens of duplicate loaded every session.

Add a row here when you add a skill; the validator fails on a public skill with no
row, and on a row with no folder.

| Skill | Status | Description |
|---|---|---|
| `forge` | stable | **Resumable** orchestrator: reports where you left off, then routes init→discovery→plan→design (gated, if UI)→harden→(build→review→ship loop, one phase/run). A UI phase can't build until its `Design:` marker is locked. `/forge help` prints a status-aware usage map. Only off-limits: questioning whether the project should exist or who builds it — context (incl. business) is welcome. |
| `forge-init` | stable | Scaffolds the two-layer Obsidian `wiki/` (project record + `knowledge/` base + `.forge/` config & taste profile); injects wiki/ADR/phase/design rules into CLAUDE.md + AGENTS.md. Offers to chain into discovery (no one-liner ask — discovery owns the brief). |
| `forge-discovery` | stable | Idea (one-liner or ingested one-pager) → `wiki/brief.md`. Base seven + sharpening six with push-until gates; unknown real use becomes a named human-evidence marker for planning. Files source docs into `knowledge/`. Never reopens whether it should exist / who builds it. |
| `forge-plan` | stable | Brief → risk-first `wiki/plan.md` with full material-bet contracts, ordered goal gates, conditional human-evidence stop, and a final release-closure phase; plus seed ADRs and substantive `architecture.md`. Behaviors trace to brief/ADR. Licensed to flag "too large to build well". |
| `forge-harden` | stable | Plan-time hardening orchestrator — persona passes as isolated subagents (-eng / -security always; -design if UI; -dx if dev-facing; -scope on request), an **economy sweep always last** (authority to cut what personas added), persona-conflict reconciliation, then the adversarial reviewer grading the before→after diff + claimed deltas. User Challenge fires on a single objector; `--auto` has a hard always-surface allowlist. |
| `forge-harden-eng` | stable | Plan-time eng review (staff eng / EM persona). Modes — LOCK / TRIAGE. Adds numeric load/latency/resource/state proof when implied, an external-reality pass, complexity checks, and goal-proving gates. |
| `forge-harden-design` | stable | Plan-time design/UX review (if UI). Modes — EXPANSION / POLISH / TRIAGE. Six rated passes, each fixing-to-10 with an artifact written into the plan (state table, journey storyboard, unresolved-decisions table). |
| `forge-harden-dx` | stable | Plan-time DX review (if dev-facing). Modes — EXPANSION / POLISH / TRIAGE. Persona-card gate, first-run TTHW bar, magical-moment vehicle, evidence-grounded friction trace — folded into phase work. |
| `forge-harden-security` | stable | Plan-time security review (CSO persona). Modes — DAILY / DEEP. OWASP, STRIDE, secrets, supply chain, LLM injection, plus explicit security/authz/abuse/scan closure in the release phase. |
| `forge-harden-scope` | stable | Plan-time scope rethink (charter-safe CEO analogue). Modes — EXPAND / HOLD / TRIM. Every expansion carries an added proof burden and paired cut/pressure valve. |
| `forge-build` | stable | Builds the next phase as a staff engineer (best version, in-boundary); reads `DESIGN.md` + the phase's design ADR as binding (off-system values = defects); **deletes what the phase supersedes in the same phase** (that's finishing the work, not scope creep — keeping a path needs a named consumer + an ADR) and sizes tests to risk (coverage, not one-per-behavior), then → forge-review. |
| `forge-review` | stable | Staff-grade code review: triage tiers (light/standard/deep — machinery scales, bar doesn't; third-party pass required at deep), scope-drift + plan-completion audit, security, tests **covered not one-each** (count/level/mocks/fixtures/runtime/lifecycle are all findings — over-testing costs the same as under-testing), strict types (escape hatches banned), DESIGN.md token pass, runtime verify, third-party pass (temp-file artifact, output verified); the economy pass covers the **whole diff including tests** and the **superseded code** the diff just made dead (deletion is an objective auto-fix; "keep for compatibility" needs a named consumer); auto-fixes with full scoped re-run after every fix, 3-attempt escape to forge-debug, and a **terminal command block whose pasted output is the hand-off condition**. Idempotent re-runs — fingerprints the phase diff (`git patch-id`), audits prior findings, reviews only the delta. Writes learnings + a structured review record **with receipts block** → `wiki/learnings.md`, and self-calibrates via `review-miss` detection (green-reviewed phases later hotfixed/reverted). |
| `forge-ship` | stable | Lands a phase: fetch + rebase onto latest base → gate + scoped typecheck/lint/tests green on the rebased tree → one squashed commit on base → build-log entry → architecture.md reconciled → `forge-wiki-maintain --fix`; auto-invokes `forge-docs` if the phase touched a doc surface. |
| `forge-docs` | stable | Post-ship doc-drift check using Diataxis (tutorial / how-to / reference / explanation). Auto-fixes concrete drift; surfaces structural gaps as taste decisions. |
| `forge-design-system` | stable | DESIGN.md as design source of truth — memorable-thing question, 2–3 named aesthetic directions, anti-default typography, token system (color / 4px spacing / radius / motion), HTML specimen page. Feeds the taste profile. |
| `forge-design-explore` | stable | Divergent design exploration — 3-4 rendered HTML variants on a served feedback board before implementation (ASCII only for terminal UIs); anti-slop + differentiation checks at generation. Reads/writes the taste profile. Locks the chosen shape as an ADR and flips the phase's `Design:` marker. |
| `forge-debug` | stable | Root-cause debugging (no fix without root cause); incidents → `wiki/notes/`. |
| `forge-ambition` | stable | Charter-safe ambition check (boldest version of what you already chose; no money/market). Every expansion names its proof burden and paired cut/pressure valve. Auto in discovery; standalone. |
| `forge-polish` | stable | Designer's-eye QA on the *running* UI: consistency, hierarchy, the shared anti-slop blacklist (mechanical grep + visual read), feel; loops fix→re-score to an exit bar (slop ≥9, design ≥8), numbered before/after evidence. Auto in `forge-review` (if UI); standalone. |
| `forge-dx` | stable | Live DX audit for dev-facing builds: TTHW, onboarding, error messages, docs/CLI scorecard. Auto in `forge-review` (if dev-facing); standalone. |
| `forge-retro` | stable | Build retrospective: synthesizes build-log + learnings + git into patterns/improvements, plus the **subtraction pass** no diff-scoped review can do — what the whole landed arc made deletable (superseded paths, single-caller abstractions, unset config, orphaned tests), filed as a `## Subtract` list in `wiki/improvements.md` for a later phase to act on. Auto in `forge` at Done; standalone. |
| `forge-wiki` | stable | Ask anything against the wiki + ingest any context (email/research/business/conversation) into `wiki/knowledge/` as flat, Timeline-based living articles. Plan-first — proposes writes/merges before mutating. |
| `forge-wiki-maintain` | stable | Wiki janitor: regenerate all indexes (`index.md`, `knowledge/INDEX.md`, per-topic `_index.md`) + health checks (orphans, broken `[[links]]`, stale evidence, dupes, flat-invariant). `--fix` for the safe ones. |
| `lizard` | stable | AI PR reviewer, one binary verdict — an approval's entire body is 🦎 (see a lizard → merge; no other emoji anywhere). Triage tiers (quick / standard / deep with multi-agent fan-out + cross-model adversary via codex/claude; runtime dep upgrades always deep + consumer matrix), "not proven safe ≠ clean" on high-risk surfaces (proof obligations — bounded/index-supported DB reads, aggregation stage order, platform limits) balanced by its mirror "not proven broken ≠ broken" (a finding carries the same proof burden as the stamp — trace broken before you assert it, hedge if you can't; the burden is re-charged **every round**, so a finding surviving an author dispute must re-earn its severity on the current head, and a blocker that can only be stated in future tense — "unbounded as it grows" — is a follow-up, not a blocker), a five-kind author-dispute taxonomy each with its own check (a prescribed fix proven impossible **voids** the finding until re-derived), claims cross-checked against linked Linear/Notion/issue context, every finding inline + actionable, collapsed receipts toggle (always a two-column `<details>` table — plain bullet receipts invalid), fingerprint dedup + delta re-review + parallel-run guard (at most one standing verdict per head — own-account 👀 in-flight claim, pre-POST re-check, later duplicate yields), `~/.lizard/` ledger + mandatory blind-spot entries, `lizard retro` for post-merge calibration. Posts as you (self-authored PRs get stamp-as-comment). Session (`lizard <pr>`), loop (`lizard sweep`), or routine; agent-agnostic (git + gh + markdown). Easter egg — "why lizard". |

> **forge suite** (23 skills) is **released** — it lives in `skills/` and is installable
> by default (no `INSTALL_INTERNAL_SKILLS` flag needed).
> Loop: `forge` → init → discovery (+ambition) → plan → design (gated stage if UI —
> design-system then design-explore per `Design: explore` phase) → harden → lock →
> per run: build → review (+polish/+dx) → ship (+docs, architecture reconcile,
> wiki-maintain); at Done: retro.
> `forge-harden` orchestrates five plan-time persona skills (-eng / -security always;
> -design if UI; -dx if dev-facing; -scope on request) as isolated subagents, runs an
> economy sweep last (with authority to cut persona additions), then an independent
> reviewer pass via Codex / Gemini / Claude (configurable in `wiki/.forge/config.yaml`,
> scaffolded by forge-init) that grades the before→after diff + claimed deltas. Each
> persona is also runnable standalone, runs the shared 0–10 rate→fix-to-10→re-rate
> loop (`forge/references/scoring.md` — honest "no change" is first-class; deltas
> cite their edit hunks), and cites the shared voice + craft-pattern references. The four runtime persona skills
> (forge-polish, forge-dx, forge-docs, forge-ambition) auto-invoke in their phase and
> also run standalone. The `wiki/` is two layers — a project record (brief, plan,
> ADRs, build-log, learnings) and a `knowledge/` base of ingested context as
> Timeline-based living articles (`forge-wiki` ingests/asks, `forge-wiki-maintain`
> keeps indexes + links healthy). Charter (relaxed): the only off-limits moves are
> questioning whether the project should exist or whether the user should build it;
> all context, business included, is welcome as input. **Economy of means** is a
> first-class principle across the suite (`forge/references/simplicity.md`): two
> axes both maximized — ambition of *outcome*, economy of *means* — with
> subtraction as the default fix. It runs at **every** stage, not just planning:
> plan (`forge-plan`, harden's economy sweep), build (`forge-build` deletes what
> the phase superseded), review (`forge-review` pass 5 covers the test diff and
> the code the diff made dead), and arc (`forge-retro`'s `## Subtract` list).
> Two corollaries live in `simplicity.md`: **deleting is a first-class edit** —
> an unused path is removed, not deprecated, and "keep for compatibility" needs a
> *named* caller — and **tests are means, not outcome**, so the bar is the fewest
> tests that would catch the regression, not one per behavior. `forge-review`
> absorbed the old `forge-qa`. The forge suite is the bulk of this repo (plus the standalone
> `lizard` PR reviewer); install everything with
> `npx skills add tinyorbit-ai/skills --all` (or `--skill '*'`). Note: `--skill`
> only honors exact names or the literal `*` — there is **no prefix/glob** matching,
> so `--skill 'forge*'` matches nothing. Run bare `npx skills add tinyorbit-ai/skills`
> for the interactive picker.
