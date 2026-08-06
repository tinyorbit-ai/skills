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

Behavioral cases live in `evals/behavioral/cases/`; each one's `config.json`
`_comment` states what it plants and why, and `evals/README.md` carries the full
catalogue. The two you should know exist without looking: **`forge-plan-judge-calibration`**
and **`forge-plan-rubric-absolute`** grade the *grader* against a hand-written
golden plan and a seeded-bloat twin — if either fails, don't trust that day's
verdicts. `_smoke` self-tests the harness.


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
  **Two skills are still in the warning band: `forge-harden` (196) and
  `forge-review` (199) — forge-review is one line off the wall, so its next edit
  must extract first.** The #18/#19 charter collapse did *not* clear them: swapping
  each skill's charter block for a one-line bar plus a pointer to `forge-principles`
  freed a few lines apiece, and those were spent in place rather than banked.
  `forge-principles` itself landed at 184 — one under the warn threshold, so treat
  it as a third file in the band. (forge-plan and forge-discovery left the band when
  their contracts moved to `references/` in #16.)
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
- **Don't cull the absolutes.** The suite carries ~280 "never"/"always"
  statements, and that number looks alarming against context-engineering guidance
  that says to drop absolute directives. It was audited on 2026-07-25 and the
  count is a bad proxy: **zero** are the formatting/naming dictates that guidance
  targets (no docstring, quote-style, casing, or line-length rules exist here).
  They are overwhelmingly charter (*"never conclude 'don't build this'"* — remove
  it and forge stops being forge), evidence discipline (*"never declare green to
  satisfy the loop"*), destructive-action guards (*"never commit to base"*),
  machine-read format contracts (`Design:` is parsed), and real technical traps
  (`never --filter=blob:none`). A sweep to reduce the count would strip the
  load-bearing ones and leave nothing worth removing. The charter's absolutes now
  have a single home in `forge-principles` instead of being restated in every
  skill, so the raw count dropped without a single guard being weakened —
  consolidation, not a cull. Duplication between a
  `SKILL.md` and its own `references/` was measured at the same time: max 1.7%.

## Skills index

Every skill, with the non-obvious parts of how it works: **[`skills/INDEX.md`](skills/INDEX.md)**.
Kept out of this file on purpose — each skill's `description` is already always in
context, so the table would be ~2,200 tokens of duplicate. Add a row when you add a
skill; the validator fails on a skill with no row, or a row with no folder.
