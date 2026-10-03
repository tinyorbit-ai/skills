# forge-gate

The forge phase gate, enforced inside Claude Code.

```
Phase 3 · Billing API  ✓ gate green 4m ago  + written checks  [ Run gate ]
Phase 3 · Billing API  ◐ changed since the last run            [ Run gate ]
Phase 3 · Billing API  ✗ gate red: bun run gate:phase-03       [ Run gate ]
Phase 5 · App icon     ◐ written checks, not checked           [ Checked ]
```

- **Which phase:** your current git branch, matched against the `**Branch:**` lines in
  `wiki/plan.md`. Off a phase branch the mod does nothing. `/gate 3` pins a phase and
  `/gate auto` unpins it.
- **Which commands:** the gate's backticked spans whose first word is a real
  executable. Deploy, release, install, send and rm-style commands are never run, and
  nor are spans with `<placeholders>`.
- **Green:** every gate command passed on exactly the files you have now. It
  compares file contents (a git tree id), so committing doesn't make a pass stale, but
  any edit does. A pass is remembered across sessions.
- **Evidence:**
  - Claude's own Bash runs of a gate command count, unless something after the
    command could hide its exit code (a pipe, `|| true`, `;`).
  - `/gate` (or **Run gate**) also counts. It lists the commands and asks before it
    runs anything.
- **The guard:** when Claude says the phase is done (or the gate passes, or it's
  ready for review or ship) while the gate isn't green, it's sent back once with
  what's missing. A turn that stops to ask a question is never sent back.
- **Written checks:** prose the commands can't prove is shown with every report. A
  gate with no commands at all waits for you to press **Checked**.

Setting `guardDoneClaims` (default on) turns the guard off. The band and `/gate` keep
working.

Install: see [`../README.md`](../README.md).
