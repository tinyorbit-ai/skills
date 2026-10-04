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
- **The guard, for forge stages:** every forge stage ends with a result line,
  `FORGE_RESULT {"skill":…,"phase":3,"gate":"green",…}`. When that line says
  `"gate":"green"`, it's checked against what actually ran on the current files. If it
  isn't true, the stage is sent back once with what's missing, told to run the gate or
  to change `"gate"` to `"red"` or `"deferred"`. The phase is the one the line names,
  so forge-ship's line is still checked after it lands on main. It works in the main
  session and in subagents. An honest `red`, `deferred` or `blocked` line always
  passes.
- **The guard, everywhere else:** with no result line, it watches for phrases. When
  Claude says the phase is done, ready for review or ship, or that the gate passes, while
  it isn't green, it's sent back once. A turn that stops to ask a question is never
  sent back.
- **Written checks:** prose the commands can't prove is shown with every report. A
  gate with no commands at all waits for you to press **Checked**.
- **Run gate** (the band's button, or `/gate`) runs the phase's gate commands now, on
  the files as they are, and shows the result in the band. It's your own way to check
  without asking Claude, e.g. before trusting a "done". Most of the time you never
  press it: Claude's runs update the band by themselves.

Commands: `/gate` runs the gate (it asks first), `/gate status` reports without
running, `/gate <n>` pins phase n when you're off its branch, `/gate auto` unpins.

## How it fits the forge loop

- **forge-plan** writes each phase's `**Verifiable gate:**`. The mod only reads it.
- **forge-build** must run the gate once before handing off. Its result line and its
  "handing to review" claim are checked.
- **forge-review** reruns the gate during runtime verification and its fix loop. Each
  run updates the band.
- **forge-ship** rebases first, which changes the files, so the old pass goes stale.
  Ship reruns the gate as its own rules require, then lands. Its result line is
  checked by phase number after the merge.
- **crack-on and Arnold workers** run unattended. The guard is what checks each "green"
  there.

Inside the normal loop the mod mostly confirms what the skills already do. Its value
is the visible state, catching a skipped or stale run, and remembering a pass across
sessions.

Limits: exit codes only, so a gate's quoted expected output isn't checked. Gates with
only manual checks can't be verified. A branch that doesn't match the plan needs
`/gate <n>`.

Setting `guardDoneClaims` (default on) turns the guard off. The band and `/gate` keep
working.

Install: see [`../README.md`](../README.md).
