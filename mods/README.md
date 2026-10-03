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
`claude --plugin-dir ~/code/skills/mods/agent-atc`.

## Index

| Mod | What it does | Notes |
|---|---|---|
| `agent-atc` | `/atc` pane: every subagent as a tree, what each is doing now, a live tool trail, a message box and Stop | Status line shows the running count. Auto-opens on the first spawn on wide terminals (`autoOpen` setting). Stop is `TaskStop` via `$.tool.call`; it works on background agents. "Quiet" = running with no tool call for 90s. |

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
