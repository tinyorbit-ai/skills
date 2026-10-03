# Mods — `mods/<name>/`

Mods are Claude Code plugins of **function hooks**. They sit inside the agent loop
(tool calls, subagent spawns, turns, the prompt) and can draw live panes, bands and
status lines. Skills tell the model what to do; mods change what Claude Code itself does.

They ship through this repo's plugin marketplace (`.claude-plugin/marketplace.json`),
**not** `npx skills`. Mods only run in Claude Code, so the cross-agent reach of
`npx skills` buys nothing. The marketplace adds versions, on/off switches and settings.
That matters for code that runs unsandboxed on every tool call.

## Install

```bash
claude plugin marketplace add tinyorbit-ai/skills --sparse .claude-plugin mods   # once per machine
claude plugin install agent-atc@tinyorbit
```

Update: `claude plugin marketplace update tinyorbit && claude plugin update agent-atc@tinyorbit`
(restart Claude Code to apply). Try a local checkout without installing:
`claude --plugin-dir "$HOME/code/skills/mods/<name>"` (absolute path; see Gotchas).

## Index

| Mod | What it does | Notes |
|---|---|---|
| `agent-atc` | `/atc` pane: every subagent as a tree, what each is doing now, a live tool trail, a message box and Stop | Status line shows the running count. Auto-opens on the first spawn on wide terminals (`autoOpen` setting). Stop is `TaskStop` via `$.tool.call`; it works on background agents. "Quiet" = running with no tool call for 90s. |
| `forge-gate` | Band above the prompt: the checked-out forge phase and whether its `**Verifiable gate:**` is green on this exact working tree. Sends a "phase done" claim back once while it isn't. `/gate` runs it | Phase = current branch matched against the plan's `**Branch:**`. Gate commands = backticked spans whose first word is a real executable; deploy/release/install/send/rm-style commands and `<placeholders>` are never run. Evidence = Claude's own Bash runs (no pipe or `\|\| true` after) or `/gate`, which asks first. "Green" is pinned to the git tree id of the working files (a throwaway index, so commits don't change it but any edit does), kept in `$.store` across sessions. A gate with no commands waits for the person's **Checked**. |
| `ship-gate` | Holds `git push` until a check passed on exactly the content being pushed, and `gh pr create` until lizard `--local` also approved it. Holds pushes onto main. `/ship` shows what a push and a PR would face; `/ship allow` (typed by the person) lets one through | Checks = Bash runs of test/typecheck/lint commands (`bun test`, `pnpm check`, `go test`, …, plus the `extraCheck` regex) whose exit code isn't masked. Lizard's verdict is read from its `LIZARD_PAYLOAD_BEGIN…END` block as it lands, mid-turn or in a subagent. Evidence is keyed by git tree ids (tracked-only and with untracked), so check → commit → push counts. A nudge, not a security control: a deliberately odd spelling of `git push` gets past it. |

## Layout

```
mods/<name>/
├── .claude-plugin/plugin.json   # name (= folder), version, description, "types", userConfig
├── hooks/hooks.json             # { "modules": ["./register.tsx"] }
├── hooks/register.tsx           # export const register: Register = (on, options) => { ... }
├── types/index.d.ts             # the $.state contract (interface PluginState)
├── tests/*.test.ts              # run by `claude plugin test`
└── tsconfig.json                # one line the engine writes; extends .claude-plugin/types/
```

`.claude-plugin/types/` is written by the engine on every load and git-ignores itself.

## Add or change a mod

1. **Load the `plugin-authoring` skill first.** It writes this build's API types.
   The types are the reference. The API is early access and moves between releases.
2. **Dev loop:** `claude --plugin-dir mods/<name>`. It reloads the mod on save.
3. **Gate:** `node evals/static/validate.mjs`. For every mod it runs
   `claude plugin validate` and `claude plugin test`. It also checks the marketplace,
   folders and versions agree.
4. **Type-check:** `bunx -p typescript tsc -p mods/<name>`. Run it after one load has
   laid the types.
5. **Release:** bump `version` in both `plugin.json` and the marketplace entry.
   The validator fails when they differ. Add or adjust the index row above. Push.

## Gotchas (each one hit while building agent-atc)

- **A bad `--plugin-dir` path fails silently.** If the folder is missing, or the `~` was
  never expanded (`--plugin-dir=~/...`, or a quoted path), Claude Code skips it with no
  error and the mod's commands just aren't there. Use an absolute path. Add
  `--debug-file /tmp/x.log` and grep the log for the mod's name to see whether it loaded.
- **`$` only goes to top-level functions.** A helper that takes `$` must be declared
  at the top of the module. A closure inside `register` that takes `$` fails
  `claude plugin validate`.
- **Engine calls in tests answer `{ value }`.** Example:
  `on('ui.open', () => ({ value: { isPlaced: true } }))`. A bare return gets the hook
  skipped, and the plugin's call throws "no implementation". Events answer their own
  result shape (`turn.complete` → `{ text }`).
- **The test kit's `$.tool.call` type omits `agentId`.** To fake a subagent's call,
  pass a variable, not an object literal. The runtime accepts it.
- **Unasked panes need a wide terminal.** A pane opened unasked (from a hook) only
  seats from 144 columns. A slash command the person runs opens it at any width.
- **Command output is read by the model.** A command's `{ text }` lands in the
  transcript. Keep it to one line.
