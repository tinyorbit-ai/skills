# tinyorbit/skills

Agent skills for Claude Code, by **tinyorbit**. Distributed via
[skills.sh](https://skills.sh) — `npx skills add tinyorbit-ai/skills`.

> Conventions, workflows, and every gotcha for adding/updating/removing skills
> in this repo are in [`CLAUDE.md`](./CLAUDE.md).

## What's here

**`forge`** — a maker's build pipeline for Claude Code. 13 composable skills that
take an idea from "I want to build this" to a locked, hardened, phased plan, then
through a `build → review → ship` loop, one verifiable phase at a time.

The pipeline's charter is the point: **the project is worth building because you
chose to build it.** forge never asks whether it should exist, never raises
money / market / demand / "is it worth it", never optimises for speed-to-value.
Just helps you build the thing well.

## Install

forge is currently experimental — install globally for use across all projects:

```bash
INSTALL_INTERNAL_SKILLS=1 npx skills add tinyorbit-ai/skills --skill '*' -g -y
```

## Quick start

```bash
/forge          # in any git repo — sets up the wiki/ scaffolding, runs discovery,
                # plans verifiable phases, hardens the plan, locks it
/forge          # again — builds the next phase, reviews it (security · tests ·
                # strict types · runtime · optional Codex), ships one squashed
                # commit on the base branch with a build-log entry
/forge help     # live status (where you are now) + the full map
```

`/forge` is **resumable**: it reads the repo's `wiki/` and git, tells you where
you left off, and continues from there. Every skill also runs standalone:
`/forge-plan`, `/forge-review`, `/forge-debug`, etc.

## The 13 skills

| Stage | Skills |
|---|---|
| Setup | `forge-init` |
| Plan | `forge-discovery` · `forge-ambition` · `forge-plan` · `forge-harden` |
| Build | `forge-build` · `forge-review` · `forge-polish` · `forge-dx` · `forge-ship` |
| Look | `forge-debug` · `forge-retro` |
| Orchestrate | `forge` (resumable; `/forge help` for the map) |

Full descriptions in [`CLAUDE.md`](./CLAUDE.md). Worldview in
[`skills/.experimental/forge/references/charter.md`](./skills/.experimental/forge/references/charter.md).

## Status

**Experimental.** Dogfooded end-to-end on a real project. Currently lives under
`skills/.experimental/` with `metadata.internal: true`; will promote to `skills/`
after more usage.

## License

MIT — see [`LICENSE`](./LICENSE).
