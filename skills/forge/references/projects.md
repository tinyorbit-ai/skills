# Projects — more than one build in one repo

A repo can hold several forge projects. Each has its own record in
`wiki/projects/<slug>/`. Everything else in `wiki/` is shared by all of them.

## Where each file lives

| File | Root project | Project `<slug>` |
|---|---|---|
| brief, plan, build-log, retro, improvements | `wiki/<file>.md` | `wiki/projects/<slug>/<file>.md` |
| design boards (`explore-<surface>.html`), frames | `wiki/.forge/` | `wiki/projects/<slug>/design/` |
| `decisions/`, `notes/`, `knowledge/`, `architecture.md`, `learnings.md`, `index.md`, `.forge/` (config, taste) | shared at `wiki/` | shared at `wiki/` |
| `DESIGN.md` (the design system) | repo root | repo root, shared |

"The plan" in any forge skill means the chosen project's `plan.md`, and so on for the
brief, build log, retro and improvements. Wikilinks to project files use the full path:
`[[projects/<slug>/plan]]`. ADRs say which project they serve in their Status line.

## Which project

The first that applies wins:

1. **Given.** An argument: `/forge <slug>`, `forge status --project <slug>`, or a slug
   passed to any forge skill. `root` names the root brief and plan.
2. **The branch.** The plan that names the checked-out branch, the root's or a
   project's: you are mid-phase.
3. **The root project.** No folders under `wiki/projects/`. A repo with only
   `wiki/brief.md` and `wiki/plan.md` works exactly as before.
4. **The only one.** `wiki/projects/` holds exactly one folder and the root is a stub.
5. **Ask.** Anything else, including a real root plan next to project folders. The
   root is never a silent default there: a worker on its own branch would write
   `wiki/plan.md` for the wrong project. Name the choices (AskUserQuestion), `root`
   among them when the root is real. Headless: end `blocked` with the choices in
   `notes`.

`node ../forge/scripts/status.mjs --project <slug> --json` applies the same rules.
Without `--project`, a `choose` stage lists the choices.

A slug is lowercase letters, digits and dashes; `root` is taken.

## A new project

`forge new <slug>` (or `forge-discovery <slug>`) in a repo that already has a plan:

- Run `node ../forge-init/scripts/init.mjs --new <slug>`. It creates
  `wiki/projects/<slug>/` from the forge-init templates and adds the project to
  `wiki/index.md` under a `## Projects` heading. It never moves or rewrites the root
  plan; `index.md` is the only existing file it edits. With no `wiki/` yet, it runs
  the forge-init setup first.
- Then run `forge-discovery` for that project.

## Branches

A project's phase branches are `phase/<slug>-<n>-<name>`, so two projects never
collide. The root project keeps `phase/<n>-<name>`. forge-plan writes the right form
into each phase's `**Branch:**` line; every later skill reads it from there.
