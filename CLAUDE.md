# Skills Marketplace — `tinyorbit-ai/skills`

This repo is Matt's personal **agent skills marketplace**. Every skill lives here as a
self-contained folder and is distributed to any machine/agent via the
[`skills` CLI](https://skills.sh) (`vercel-labs/skills`, run as `npx skills`).

> CLAUDE.md is the shared source of truth. `AGENTS.md` is Codex's entry point and
> requires this file in full so both agents use the same workflows and index.

## How distribution works

The `skills` CLI indexes any public git repo containing valid `SKILL.md` files.
Once a skill is pushed to `main`, it is installable anywhere:

```bash
npx skills add tinyorbit-ai/skills                         # interactive: pick skills
npx skills add tinyorbit-ai/skills --skill <name> -g        # one skill, global (~/.claude/skills/)
npx skills add tinyorbit-ai/skills --all                    # everything, all agents
```

No manifest, registry submission, or build step is required — **push = published**.
The CLI symlinks (or `--copy`) installed skills into each agent's skills directory
(`~/.claude/skills/`, `.cursor/skills/`, etc.). Skills work across 50+ agents;
`allowed-tools` and `context: fork` are Claude Code-specific.

## Repo structure

```
skills/
├── <skill-name>/              # Production skill — discovered & installable by default
│   ├── SKILL.md               # REQUIRED. Frontmatter + instructions, <200 lines
│   ├── references/            # Optional. Docs loaded on demand (progressive disclosure)
│   ├── scripts/               # Optional. Executable helpers the agent runs
│   └── assets/                # Optional. Files used in skill output (templates, etc.)
└── .experimental/             # Experimental skills — hidden from default discovery
    └── <skill-name>/SKILL.md
```

The CLI discovers skills in `skills/`, `skills/.curated/`, `skills/.experimental/`,
`skills/.system/`, a root `SKILL.md`, and agent dirs. We use **`skills/` for shipped
skills** and **`skills/.experimental/` for WIP** (see below).

## SKILL.md anatomy

```yaml
---
name: skill-name                # REQUIRED. lowercase-with-hyphens, must match folder name
description: One sentence on what it does + when to use it. Use when <trigger>.
metadata:
  internal: false               # Optional. true = hidden unless INSTALL_INTERNAL_SKILLS=1
# allowed-tools: Bash, Read     # Optional, Claude Code only
---

# Skill Name

Markdown instructions the agent follows when the skill triggers.
```

Rules (from the canonical create-skill guide — keep one in this repo as reference):

- **200-line rule**: `SKILL.md` body stays under 200 lines. Overflow goes to
  `references/*.md` and is linked, not inlined (progressive disclosure).
- **`description` is the trigger.** It's always in context — make it specific and
  include "Use when…". This is what makes the agent reach for the skill.
- **Be concise.** The context window is shared; every line must justify its tokens.
- **Match degrees of freedom to the task.** Prose for open-ended work; exact scripts
  for fragile/deterministic operations.
- Folder name === `name` in frontmatter.
- **Never `": "` mid-sentence in `description:`.** A bare colon-space inside a
  single-line YAML value (`description: Four phases: investigate, …`) makes YAML
  parse it as a nested mapping, `parseSkillMd` returns `null`, and the skill
  **silently vanishes from `npx skills` discovery** — no error, just gone. Use an
  em-dash (` — `), a comma, or quote the whole value / switch to block scalar
  (`description: |`). This trap shipped once in `forge-debug` and dropped it from
  the remote install until fixed; don't relearn it.

## Workflows

### Add a new skill

1. Scaffold: `npx skills init skills/<skill-name>` (creates `skills/<skill-name>/SKILL.md`)
   — or start it in `skills/.experimental/<skill-name>/` if it's a draft.
2. Write the frontmatter `description` first (it's the trigger) then the body.
3. Keep `SKILL.md` < 200 lines; push detail into `references/`, `scripts/`, `assets/`.
4. Validate locally before pushing:
   - `node evals/static/validate.mjs` — frontmatter, discovery, references, index sync (see **Evals**).
   - Install it locally and dry-run the workflow it describes.
5. Commit one skill per commit where practical. Push to `main` — it's now live.
6. Add a row to the **Skills index** table below.

### Update an existing skill

Follow the eval-gated loop (see **Evals**): baseline → implement → re-run → update
the evals in the same change.

1. **Baseline:** run the relevant eval tiers on the current state, record scores.
2. Edit the skill in place. Bump behavior, fix instructions, extend references.
3. **Re-run** the same tiers — equal-or-better than baseline is the bar; a drop is
   a regression to fix before pushing.
4. **Update the evals** alongside: new/adjusted trigger cases for description
   changes, updated behavioral checks (or a new case) for behavior changes.
5. Push. Consumers pull the change with:
   ```bash
   npx skills update <skill-name>        # or: npx skills update (all)
   ```
6. Skills are not versioned by the CLI — `update` always pulls latest from `main`.
   For breaking changes, note it in the commit message and the index table.

### Remove a skill

1. Delete the skill folder from the repo and its **Skills index** row. Push.
2. Already-installed copies are not auto-removed. Document that consumers run:
   ```bash
   npx skills remove <skill-name>
   ```

### Experimental / work-in-progress skills

Two independent mechanisms — use **both** for true WIP:

1. **Location**: keep it in `skills/.experimental/<name>/`. Dot-prefixed dirs are
   not surfaced in default discovery for `tinyorbit-ai/skills`.
2. **Flag**: set `metadata.internal: true` in the frontmatter. Internal skills are
   only listed/installable when the consumer sets `INSTALL_INTERNAL_SKILLS=1`:
   ```bash
   INSTALL_INTERNAL_SKILLS=1 npx skills add tinyorbit-ai/skills --skill <name>
   ```

**Promote to stable** when ready: move the folder
`skills/.experimental/<name>/ → skills/<name>/`, remove `metadata.internal`
(or set `false`), validate, push, and add it to the index.

Also use `metadata.internal: true` for repo-tooling skills (linting/validating/
scaffolding skills) so they don't pollute discovery — these can stay in `skills/.system/`.

## Evals — the edit loop for every skill change

Skills are prompts, so `evals/` tests them in three tiers. There is **no CI** —
the evals are part of *editing skills in this repo*, run by whoever (human or
agent) is making the change. **Scope: the forge suite only, for now** (`forge` +
`forge-*`; lizard has its own harness — see **Lizard** below; other non-forge
skills are excluded until deliberately added — every runner takes `--all` to
widen). Full docs + add-a-case guide: `evals/README.md`.

A case passes when **every** run clears the deterministic `check.mjs` assertions
**and** the **median** judge score per dimension across runs clears the floor —
not every run's every dimension. Measured: the golden reference plan scores 7–8 on
its tightest dimension against a floor of 7, so all-runs-must-clear lands ~30% of
the time regardless of quality. The median measures typical output, which is what
the rubric always meant; the seeded-degraded plan (0–1) fails either way.

| Tier | Command | Proves | Cost |
|---|---|---|---|
| 0 static | `node evals/static/validate.mjs` | frontmatter parses, `npx skills` discovery, references resolve, index sync, the `": "` description trap | free, seconds |
| 1 trigger | `node evals/trigger/run.mjs` | utterances route to the right skill from live `description`s alone (Haiku router, near-miss sibling cases) | pennies |
| 2 behavioral | `node evals/behavioral/run.mjs <case> --runs 3` | the skill run headless end-to-end produces its contracted artifacts (deterministic checks + LLM-judge rubric) | real tokens, minutes |

**The loop (mandatory when asked to change a forge-suite skill):**

1. **Baseline first.** Before touching anything, run the relevant tiers against
   the current state and record the scores: tier 0 always; tier 1 if any
   `description` will change; the touched skill's tier-2 case if one exists
   (`--runs 3` for anything you'll compare).
2. **Implement** the change.
3. **Re-run the same tiers.** Compare against the baseline — any drop is a
   regression to fix before pushing. Equal-or-better scores are the merge bar.
4. **Update the evals with the change.** A skill edit that alters behavior must
   land with its eval delta in the same change: description edits add/adjust
   trigger cases; body/contract edits update the behavioral case's checks or add
   a new case; a real-world miss (routing or review) becomes a permanent case.
   Evals and skills drift apart otherwise — the suite only stays honest if it
   evolves in lockstep.

Behavioral cases: `forge-plan-structural` (brief → plan; gates must prove goals,
not hygiene, plus free economy-of-means script checks; the judge grades against
forge's own `simplicity.md` verbatim, four dimensions, floor ≥ 7),
`forge-plan-judge-calibration` (judge-only: golden vs seeded-bloat plan, both
orders — if the judge can't tell them apart, don't trust its other verdicts),
`forge-plan-rubric-absolute` (judge-only, the same pair scored **one at a time**
against the floor — the mode every real case uses, and the one that went untested
until it bit; its headroom check fails by design, standing evidence that golden's
worst dimension equals the floor),
the tripwired pair — `forge-plan-tripwired-simple` / `-comprehensive` (briefs
whose non-goals ban named features; judge dimension behavior_traceability
requires every phase behavior to trace to a brief clause or an ADR),
the planning-discipline quartet — `forge-planning-disciplines-small` / `-large` /
`-product` (risk contracts/order, human evidence, numeric NFRs, external reality,
ambition pressure valves, and release closure across three project shapes) plus
`-tiny`, the proportionality floor (one file, one user, nothing published — release
closure must collapse to one `n/a` line; grades both enumerating the nine items to
n/a them and, worse, inventing packaging/telemetry/runbook work to fill them),
`forge-review-planted-bugs` (three seeded defects; recall + mandated auto-fixes —
validated live at 3/3), and the wiki pair — `forge-wiki-ingest-living-article`
(second source must Timeline-merge, not duplicate or overwrite) and
`forge-wiki-maintain-planted-rot` (six seeded rot items; safe fixes applied,
structural ones reported-never-touched). `_smoke` self-tests the harness.

### Lizard

`evals/lizard/` is lizard's own regression suite (separate machinery — a PR
reviewer is graded on verdicts, not artifacts): planted-defect PRs in
`tinyorbit-ai/lizard-fixtures` graded against `cases.json`, a deterministic
format linter, and a field lint over real `~/.lizard` history. **Before pushing
any change to `skills/lizard/`, run the smoke set** —
`evals/lizard/bin/run.sh` then `bin/grade.mjs --run-id <id>` — and check the
scorecard (false-🦎 must be 0). One-time setup:
`evals/lizard/fixtures/bootstrap.sh`. Details in `evals/lizard/README.md`.

`dispute-measured-scale` is the suite's **two-round** case (`round1/` +
`thread.json`): bootstrap seeds a prior lizard review and an author dispute reply
before handing lizard the fixed head, so the delta re-review path is graded on how
a finding is *disposed of* rather than whether it is found. Golden answer is a
stamp; restating the residue in future tense is the false-block it exists to catch.

Two traps when running these, both hit for real:

- **`run.sh` symlinks the working-tree skill.** Never edit `skills/lizard/` while a
  baseline is running — cases after your edit silently test the new prompt. Run the
  baseline from a `git worktree` pinned to the pre-change commit.
- **`grade.mjs` grades all of `cases.json`, not just what ran.** A single-case run
  scores the other cases as errors; read the per-case row, not the pass rate, and
  annotate the SCOREBOARD row.

## Command reference

| Action | Command |
|---|---|
| Scaffold a skill | `npx skills init skills/<name>` |
| List skills in this repo | `npx skills add . --list` |
| Install all (this repo) | `npx skills add tinyorbit-ai/skills --all` |
| Install one globally | `npx skills add tinyorbit-ai/skills --skill <name> -g` |
| Include experimental/internal | `INSTALL_INTERNAL_SKILLS=1 npx skills add tinyorbit-ai/skills --skill <name>` |
| List installed | `npx skills list` (`--global` for user scope) |
| Update | `npx skills update [<name>...]` |
| Remove | `npx skills remove <name>` |
| Search ecosystem | `npx skills find [query]` |

Scope flags: `-g/--global` (user `~/.claude/skills/`) vs project (`.claude/skills/`,
default). `--copy` copies instead of symlinking. `-a/--agent '*'` targets all agents.

## Gotchas

- **No versioning.** `update` = latest `main`. There's no pinning; treat `main` as
  the release channel. Land breaking changes deliberately.
- **`description` quality is everything.** A vague description means the agent never
  triggers the skill. Lead with the capability, end with "Use when …".
- **200-line ceiling is real.** Long `SKILL.md` files load slowly and bloat context.
  Split aggressively into `references/`. The validator warns at ≥185 body lines and
  fails at ≥200.
  **Three skills are parked in the warning band and will hit the wall on their next
  growth: `forge-plan` (192), `forge-harden`/`forge-discovery` (196), and
  `forge-review` is now at the line (199) — its next edit must extract first.**
  When you next edit one substantively, extract *then* — you're already paying for
  its behavioral eval re-run, and where a contract lives is behavior-affecting, so
  it needs the baseline→change→re-run loop either way. Don't do it as standalone
  churn. Extract only **step-scoped** material (needed at one step of the process);
  hot-path content used every run belongs in `SKILL.md` — moving it out trades a
  lint warning for the agent skipping it.
- **Folder name must equal `name`.** Mismatches break discovery/install.
- **Experimental needs both** the `.experimental/` location *and* `metadata.internal:
  true` — the dir alone won't gate it once discovery falls back to recursive search.
- **Validate before pushing.** `push = published`; there's no review gate but us.

## Skills index

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
