# tinyorbit/skills

Agent skills for Claude Code, by **tinyorbit**. Distributed via
[skills.sh](https://skills.sh) — `npx skills add tinyorbit-ai/skills`.

> Conventions, workflows, and every gotcha for adding/updating/removing skills
> in this repo are in [`CLAUDE.md`](./CLAUDE.md).

## What's here — forge

The goal, stated plainly:

> forge exists to create **high-quality software** and keep an **always
> up-to-date wiki** that is not just ADRs but a comprehensive record. The
> principles behind high-quality software are **simplicity, maintainability,
> and scalability**. It is essentially **gstack without the YC bloat and
> founder mode**. It starts from a brief or a single sentence and creates a
> plan split into phases that can be resumed by re-running forge. The plan is
> hardened so that high-quality software comes out, and each kind of task has
> its own cycle: **design has a shotgun** — HTML files that set the direction
> before code — **build has review**, and **harden and ship ensure everything
> is green before it merges back**.

That paragraph is the spec. Everything in the suite is wiring to enforce it —
simplicity as economy of means (the fewest parts that fully deliver the
outcome), maintainability as boundaries-drawn-where-change-is-isolated plus
strict types and real tests, scalability as scale assumptions stated in the
architecture and checked rather than discovered in production. And zero
gatekeeping: forge never asks whether the project should exist or whether
you're the right person to build it — context (business included) is welcome
as input; it never becomes a verdict.

## How it works

Start from **a brief or a single sentence**. forge turns it into a plan split
into **phases, resumable by re-running `/forge`** — every run reads the wiki and
git, reports where you left off, and continues from exactly there.

Each kind of work has **its own cycle**:

- **Design** — a shotgun: 3–4 rendered HTML variants on a served feedback board
  set the direction *before any code exists*; the pick locks as an ADR, and the
  locked system (`DESIGN.md`) is read by build and enforced by review.
- **Build → review** — every built phase is reviewed: security, real passing
  tests, strict types, runtime verification, and a terminal command block whose
  pasted output is the hand-off condition.
- **Harden** — persona reviews (eng, security, design, dx, scope) plus an
  independent adversarial reviewer, with an **economy sweep last** so hardening
  strengthens the plan without bloating it.
- **Ship** — rebases the phase branch onto the latest base, re-verifies the
  gate plus scoped typecheck/lint/tests on the rebased tree, and only then
  squash-merges: **everything is green before it merges back.**

## Install

```bash
npx skills add tinyorbit-ai/skills --all        # the whole forge suite
npx skills add tinyorbit-ai/skills              # interactive picker
```

## Quick start

```bash
/forge          # first run: wiki scaffold → discovery → plan → design (if UI)
                # → harden → lock
/forge          # each later run: build → review → ship, one phase at a time
/forge help     # live status (where you are now) + the full map
```

Every skill also runs standalone: `/forge-plan`, `/forge-review`,
`/forge-debug`, `/forge-wiki`, etc.

## The suite

| Stage | Skills |
|---|---|
| Setup | `forge-init` |
| Plan | `forge-discovery` · `forge-scope` · `forge-plan` · `forge-harden` |
| Design | `forge-design-system` · `forge-design-explore` |
| Build | `forge-build` · `forge-review` · `forge-polish` · `forge-dx` · `forge-ship` · `forge-docs` |
| Look | `forge-debug` · `forge-retro` |
| Wiki | `forge-wiki` |
| Orchestrate | `forge` (resumable; `/forge help` for the map) |

Per-skill notes in [`skills/INDEX.md`](./skills/INDEX.md). The quality bar is
[`skills/forge-principles/SKILL.md`](./skills/forge-principles/SKILL.md), with economy of
means in
[`skills/forge-principles/references/simplicity.md`](./skills/forge-principles/references/simplicity.md).

## Mods

Claude Code mods (plugins of function hooks) live in [`mods/`](./mods/README.md)
and install through this repo's plugin marketplace:

```bash
claude plugin marketplace add tinyorbit-ai/skills --sparse .claude-plugin mods
claude plugin install agent-atc@tinyorbit     # /atc: live control pane for subagents
claude plugin install forge-gate@tinyorbit    # /gate: the forge phase gate, enforced
claude plugin install ship-gate@tinyorbit     # /ship: no push before checks, no PR before lizard
```

## License

MIT — see [`LICENSE`](./LICENSE).
