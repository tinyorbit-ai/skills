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
   passed to any forge skill.
2. **The only one.** `wiki/projects/` holds exactly one folder.
3. **The root project.** No folders under `wiki/projects/`, or the root brief or plan is
   real (not a stub). The root files are the default project, so a repo with only
   `wiki/brief.md` and `wiki/plan.md` works exactly as before.
4. **Ask.** Name the choices (AskUserQuestion). Headless: end `blocked` with the
   choices in `notes`.

`node ../forge/scripts/status.mjs --project <slug> --json` applies the same rules;
without `--project`, a `choose` stage lists the projects.

A slug is lowercase letters, digits and dashes.

## A new project

`forge new <slug>` (or `forge-discovery <slug>`) in a repo that already has a plan:

- Run `node ../forge-init/scripts/init.mjs --new <slug>`. It creates
  `wiki/projects/<slug>/` from the forge-init templates and adds the project to
  `wiki/index.md` under a `## Projects` heading. It never moves or rewrites the root
  plan or any existing file.
- Then run `forge-discovery` for that project.

## Branches

A project's phase branches are `phase/<slug>-<n>-<name>`, so two projects never
collide. The root project keeps `phase/<n>-<name>`. forge-plan writes the right form
into each phase's `**Branch:**` line; every later skill reads it from there.
