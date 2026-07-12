# pomo — wiki

One line: a terminal pomodoro timer — one command, a live countdown, a bell.

## Project record

- [[brief]] — locked by forge-discovery
- [[plan]] — filled by forge-plan (2 phases, base branch `main`)
- [[architecture]] — v1 by forge-plan (pure state/render seam, single zero-dep file)

## Decisions

- [[decisions/0001-build-approach]] — pure state/render seam in a single zero-dep file (Approach B); `node:test`, no build step
- [[decisions/0002-rendering-strategy]] — wall-clock-anchored, width-clamped, in-place repaint (not alt-screen/TUI)
- [[decisions/0003-design-routing]] — one open surface → tight ASCII design-explore; skip DESIGN.md

## Knowledge base

(none yet)
