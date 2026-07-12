# Brief — pomo

> Compiled by forge-discovery. Locked.

## What we're building

`pomo` — a terminal pomodoro timer. `pomo` starts a 25-minute countdown;
`pomo 15` starts a 15-minute one. While running it shows the remaining time as a
large-ish live countdown with a simple progress bar, and when it hits zero it
rings the terminal bell and prints "done — take a break". Ctrl-C cancels cleanly
with no residue. That is the whole product.

## Who & when

Me (Matt). Several times a day while working, launched from whatever terminal is
already open.

## How it should feel

Instant and disposable. Type it, glance at it occasionally, forget it exists.
Starting a timer must never involve a decision beyond the number of minutes.

## The hard part

The countdown display: it should update in place (no scrolling wall of lines),
survive terminal resize without garbling, and stay accurate over 25 minutes
(tick drift must not accumulate — the end time is wall-clock anchored, not
sum-of-sleeps).

## Constraints

- Node 22, zero runtime dependencies, single executable file.
- Works in a plain macOS Terminal and in tmux.
- No install step beyond dropping it on the PATH.

## Non-goals

- **No config file, no flags beyond the minutes argument.** Not `--sound`, not
  `--message`, nothing.
- **No stats, history, logging, or streaks.** It keeps no record of anything.
- **No desktop notifications, no menu-bar presence.** The terminal bell is the
  notification.
- No break timers, no work/break cycles, no task names. One timer, one number.

## Alternatives considered

A phone timer (requires picking up the phone — the defeat condition), the
`timer` npm package (a dependency for a countdown is embarrassing), a shell
one-liner with `sleep` (no live display, drifts, garbles on resize).

## Sharpening

- **The specific moment:** deciding to focus and wanting the timer running
  within two seconds, before the impulse fades.
- **Smallest useful version:** `pomo` counting down 25 minutes and ringing the
  bell. That version is also the largest useful version.
- **Ambition check (locked):** the ambition is the *feel* — in-place repaint,
  no drift, clean cancel. Not more features.
