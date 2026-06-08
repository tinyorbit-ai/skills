---
name: forge-init
description: One-time project setup for the forge workflow. Scaffolds an Obsidian-style wiki/ (index, brief, plan, architecture, decisions/ ADRs, notes/, improvements), and injects wiki + ADR + phase/branch discipline rules into CLAUDE.md and AGENTS.md (creating them if absent, idempotently). Use when starting a forge project, when asked to "init forge", "set up the wiki", "scaffold docs", or before forge-discovery/forge-plan on a fresh repo.
metadata:
  internal: true
---

# forge-init

Sets up a project so every later decision and incident is captured, and so building
follows the phase/branch discipline. Run once per repo. Idempotent — safe to re-run;
it never clobbers existing content.

## Charter

The project is worth building because you chose to. forge never questions whether it
should exist or raises money/market/demand. This skill just builds the scaffolding
that captures the *why* as you go.

## What it does

### 1. Detect state

- `git rev-parse --show-toplevel` for repo root; cd there. If not a git repo, tell
  the user and offer `git init` (don't proceed without a repo — the discipline needs branches).
- Check whether `wiki/` exists, and whether `CLAUDE.md` / `AGENTS.md` exist.
- Read existing `CLAUDE.md`/`AGENTS.md` fully before touching them.

### 2. Scaffold the wiki

Create `wiki/` with these files **only if missing** (never overwrite). Use the
templates in `references/templates.md`, substituting `{PROJECT}` from the repo
directory name. Leave `{ONELINE}` as the placeholder `_filled by forge-discovery_`
— **do not ask the user for a one-liner here**. The proper brief intake belongs
to `forge-discovery`, which captures the full problem framing, not a sentence.

```
wiki/
├── index.md          map of content + reading order (links to everything below)
├── brief.md          stub — "filled by forge-discovery"
├── plan.md           stub — "filled by forge-plan"
├── architecture.md   stub — 30-second architecture, filled as phases land
├── build-log.md      one entry per landed phase (appended by forge-ship)
├── decisions/        ADRs live here (NNNN-slug.md); create with .gitkeep
├── notes/            incident notes live here (YYYY-MM-DD-slug.md); .gitkeep
├── learnings.md      running review lessons (appended by forge-review)
├── retro.md          running build retrospectives (appended by forge-retro)
└── improvements.md   running "what I'd do with more time" + scope cuts
```

If `wiki/` already exists, only add the missing files; report what was added.

### 3. Inject the rules into CLAUDE.md and AGENTS.md

The agent must be told to keep the wiki current. Inject the block from
`references/templates.md` (section "Agent rules block") into **both** `CLAUDE.md`
and `AGENTS.md`:

- The block is delimited by:
  `<!-- BEGIN:forge-wiki-rules -->` … `<!-- END:forge-wiki-rules -->`
- **Idempotent:** if those markers already exist in a file, replace the content
  between them with the current block (so re-running updates it). Otherwise append
  the block to the end of the file.
- If a file does not exist, create it containing the block. For `CLAUDE.md`, if it
  is being created fresh and an `AGENTS.md` exists, make `CLAUDE.md` just `@AGENTS.md`
  plus the block — or, if the user prefers a single source, ask (AskUserQuestion)
  whether `CLAUDE.md` should `@AGENTS.md` or carry its own copy.
- Never duplicate the block. Never edit outside the markers.

### 4. Establish phase/branch discipline

Confirm the base branch (current branch, usually `main`). Record it in
`wiki/plan.md`'s header. State the contract back to the user explicitly:

> Phases run on `phase/<n>-<slug>` branches off `<base>`. Commit freely on a phase
> branch; a finished phase merges back as exactly one squashed commit, only after
> its verifiable gate is green, with one `wiki/build-log.md` entry.

(Full contract: the forge suite's `branch-discipline` reference. `forge-ship`
enforces it. `forge-init` only sets it up and records the base branch.)

### 5. Report and offer to chain into discovery

List every file created and every file the rules block was injected into (created
vs. updated-in-place).

Then **offer (via AskUserQuestion)** to invoke `forge-discovery` right now to
build the real project brief. Two options:

- **Yes — run discovery now.** Recommended default. Chains directly into
  `forge-discovery`, which collects the full brief and replaces the
  `wiki/brief.md` stub + the `{ONELINE}` placeholder in `wiki/index.md`.
- **Not yet — I'll run it later.** Stop here; the scaffold is complete and the
  user can run `forge-discovery` (or `forge`) whenever they're ready.

If the user invoked `forge-init` as part of a `forge` orchestration run, defer
the offer to `forge` (it already handles "fresh project → setup → discovery →
plan → harden" chaining via its own AskUserQuestion). Standalone runs of
`forge-init` are the ones that need this offer.

## Rules

- **Never overwrite** an existing wiki file or content outside the markers.
- The wiki is the source of truth for the *why*. The rules block must make the
  agent record ADRs for decisions and notes for incidents — see the template.
- Don't write any feature/product code here. Setup only.

## References

- `references/templates.md` — every wiki file template + the CLAUDE/AGENTS rules block
