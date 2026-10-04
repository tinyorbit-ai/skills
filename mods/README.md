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
claude plugin install forge-gate@tinyorbit
```

An installed mod loads in every Claude Code session on that machine, terminal and
desktop alike. `claude plugin disable <name>@tinyorbit` turns one off without removing it.

Update: `claude plugin marketplace update tinyorbit && claude plugin update <name>@tinyorbit`
(restart Claude Code to apply). An install only picks up a change when `version` was bumped. Try a local checkout without installing:
`claude --plugin-dir "$HOME/code/skills/mods/<name>"` (absolute path; see Gotchas).

## Index

| Mod | What it does | Notes |
|---|---|---|
| `agent-atc` | `/atc` pane: every subagent as a tree, what each is doing now, a live tool trail, a message box and Stop | Status line shows the running count: an agent `waiting` (on background work, a plan approval or a child) counts, an `idle` teammate doesn't. Auto-opens on the first spawn on wide terminals (`autoOpen` setting). Stop is `TaskStop` via `$.tool.call`; it works on background agents. "Quiet" = running with no tool call for 90s. |
| `forge-gate` | Band above the prompt: the checked-out forge phase and whether its `**Verifiable gate:**` is green on this exact working tree. Checks every forge stage's `FORGE_RESULT … "gate":"green"` line against what actually ran (main session and subagents, phase found by number). With no result line it guards "phase done" phrases instead. `/gate` runs it | Phase = current branch matched against the plan's `**Branch:**`. Gate commands = backticked spans whose first word is a real executable; deploy/release/install/send/rm-style commands and `<placeholders>` are never run. Evidence = a Bash run where the gate command is a whole segment run in the repo root, with only `&&`/`;` before it and only `&&` after (a subagent's run needs an explicit `cd <root> &&`), finished in the foreground; or `/gate`, which asks first. Each run is pinned to the git tree id of the files before it ran (a throwaway index, `wiki/` left out), so commits don't change it but any edit does. Runs are kept per repo and command in `$.store`, whichever branch is out. A gate with no commands waits for the person's **Checked**. |

## Layout

```
mods/<name>/
├── .claude-plugin/plugin.json   # name (= folder), version, description, "types", userConfig
├── hooks/hooks.json             # { "modules": ["./register.tsx"] }
├── hooks/register.tsx           # export const register: Register = (on, options) => { ... }
├── types/index.d.ts             # the $.state contract (interface PluginState)
├── tests/*.test.ts              # run by `claude plugin test`
└── tsconfig.json                # extends .claude-plugin/types/, minus the MCP tool types
```

`.claude-plugin/types/` is written by the engine on every load and git-ignores itself.

## Add or change a mod

1. **Load the `plugin-authoring` skill first.** It writes this build's API types.
   The types are the reference. The API is early access and moves between releases.
2. **Dev loop:** `claude --plugin-dir "$PWD/mods/<name>"` (an absolute path). It reloads the
   mod on save.
3. **Gate:** `node evals/static/validate.mjs`. For every mod it runs
   `claude plugin validate` and `claude plugin test`. It also checks the marketplace,
   folders and versions agree.
4. **Type-check:** `bunx -p typescript@5.9 tsc -p mods/<name>`. Run it after one load has
   laid the types. TypeScript 5.6 gives up on the test kit's types.
5. **Release:** bump `version` in both `plugin.json` and the marketplace entry.
   The validator fails when they differ. Add or adjust the index row above. Push.

## Gotchas (each one hit while building these mods)

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
- **`$.ui.ask` is an `AskUserQuestion` tool call.** A test answers it with
  `on('tool.call', { tool: 'AskUserQuestion' }, …)`. It rejects when the person
  dismisses it and under `claude -p`, so catch it.
- **The test kit can't stand in for `session.append`.** A test hook must call `next`,
  and nothing sits beneath it. Cover that path with a headless run instead.
- **Claude Code prefixes a status line with the plugin's name** (`⚠ agent-atc: …`).
  Don't repeat the name in the text.
- **Agents have a `waiting` status** while they block on their own background shell.
  Treat every status outside a known end set (completed, failed, killed, stopped) as live.
- **Fingerprint files with a git tree id, not HEAD.** Build it in a throwaway index
  (`GIT_INDEX_FILE=$tmp git add -A && git write-tree`). It stays the same across a
  commit, changes on any edit, and never touches the real index. A HEAD + diff hash
  goes stale on every commit.
- **Leave the MCP tool types out of the type check.** The engine also lays a type for
  every MCP tool connected on the machine (about 700 here). A `$.tool.call` against that
  union is "excessively deep" for the compiler, so the check would pass or fail
  depending on whose machine it is. Each mod's `tsconfig.json` sets
  `"types": ["claude-code", "claude-code-tools"]`. Remove that only for a mod that calls MCP tools.
- **`npx skills` reads the marketplace too.** It installs any `mods/<name>/skills/*/SKILL.md`
  as a skill to every agent, outside tier 0's checks. Keep skills in `skills/`.
- **Panes dock only in the fullscreen layout.** tmux uses the main screen by default.
  `CLAUDE_CODE_NO_FLICKER=1` gives the fullscreen layout, where a pane sits beside the
  transcript. `tmux capture-pane -e -p` captures a session with its colors for docs.
