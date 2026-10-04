# ship-gate

No push before the checks pass, no PR before lizard has looked. Enforced in every
session, not just the ones where you remembered to run shepherd.

```
ship-gate held `git push`:
- no check has run on exactly what feat/math holds (tree 7fd658a). Run the repo's tests or checks first.
Do that, then try again. If the person wants it through as it is, they type /ship allow.
```

- **`git push`** is held until a check has passed on exactly the content being
  pushed. Pushes onto main (or master) are held whatever the checks say.
- **`gh pr create`** is also held until `lizard --local` approved that same content.
  That matches shepherd: lizard before the PR, checks before every push.
- **What counts as a check:** Claude's Bash runs of tests, typecheck or lint
  (`bun test`, `pnpm check`, `go test`, `cargo test`, `pytest`, `xcodebuild … test`,
  `tsc --noEmit`, …). A run only counts when nothing after it can hide its exit code
  (a pipe, `|| true`, `;`). For repo-specific checks, add a regex in the `extraCheck`
  setting.
- **What counts as lizard:** the verdict block lizard `--local` prints
  (`LIZARD_PAYLOAD_BEGIN … END`). It's read as it lands, so it also counts mid-turn or
  from a subagent. Only `APPROVE` lets a PR through.
- **"Exactly the content":** evidence is tied to git tree ids, not commits. So
  check → commit → push goes through. A stray untracked file you never commit doesn't
  get in the way, and any real change after the check does.
- **`/ship`** shows what a push and a PR would face right now. **`/ship allow`** lets
  the next held one through within 10 minutes. It only works when you type it.
- **Status line:** `ship-gate: checks ✓ · lizard 🦎` on any branch other than the default.

Settings: `holdMainPush` and `requireLizard` (both on by default), and `extraCheck`.

This is a nudge, not a security control. A deliberately odd spelling of `git push`
gets past it.

Install: see [`../README.md`](../README.md).
