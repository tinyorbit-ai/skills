# hud

A heads-up display for the session, inside Claude Code. What you would otherwise scroll
back for stays in one place.

```
 ▚ HUD                                       1 need you
▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
╭──────────────────────────────────────────────────────╮
│ NEEDS YOU                                          1 │
│                                                      │
│ ◆ Does the static site need a custom domain, or is a │
│   default URL fine?                                  │
│   1m ago  1: answer  done                            │
╰──────────────────────────────────────────────────────╯

▍ANSWERS ───────────────────────────────────────────── 2
Is 17 a prime number?
↳ Yes, 17 is prime.

▍RESOURCES ─────────────────────────────────────────── 3
🔗 tinyorbit-ai/skills#41                             PR
📄 hooks/register.tsx:12                            file
🌐 mac.example.ts.net:8080                         local

▍HEADS-UP ──────────────────────────────────────────────
▲ No tests were run.

▍NEXT ──────────────────────────────────────────────────
➜ Deploy to Cloudflare Pages.
  n: put it in my prompt

haiku read the last turn just now · 1.4k tok
```

- **Needs you:** every question Claude asked that you haven't answered. A question dialog
  you closed lands here too. `answer` puts the question in your prompt box. `done` drops it.
  A question you answer in your next message clears itself.
- **Answers:** each question you asked, with the reply's answer in one line. One the reply
  skipped shows as `Not answered yet.` and is checked again each turn until it is answered.
- **Resources:** every pull request, issue, file, local URL, deploy and published page the
  session handed you. Kept for the whole session, no repeats. A terminal opens them on a
  click. The desktop app opens `https` links, and copies anything else on a press. A link
  the reader labelled in its own words shows its host beside it.
- **Running:** background shells the main loop started and that have not ended.
- **Heads-up:** what the last reply says was not done, not verified, or needs watching.
- **Next:** the one next step the last reply proposed.

`/hud` opens the pane and gives it the keyboard. Esc hands the keyboard back.
`/hud close` closes it. `/hud clear` empties it. A short band above the prompt sums the
HUD up, and shows the open questions while the pane is closed.

## How it gets its content

When a turn of the main conversation ends, a small model (`haiku` by default) reads what
you wrote that turn and Claude's final reply, and returns the six lists above as JSON. It
runs after the turn has ended, so you never wait on it. One read is about 1–3k tokens.
A few things need no model: a closed question dialog, a background shell, and the URL
`gh pr create` or `gh issue create` printed.

- The reader sees the **final reply** of a turn, not the text between tool calls.
- If the read fails, the HUD says so and keeps the URLs it can find in the reply itself.
- A `-p` run or an SDK worker draws nowhere, so nothing is read there and it costs nothing.
- The HUD lives in the session's state. `/clear` empties it.

The banner at the top of the pane is a terminal-only strip of colour. A light sweeps
across it while Claude works or the turn is being read.

## Settings

| Setting | Default | What it does |
|---|---|---|
| `model` | `haiku` | The model that reads each turn: an alias or a full model id. |
| `autoOpen` | on | Opens the pane by itself the first time the HUD has something to show. Wide terminals only (144+ columns). Closing it yourself keeps it closed until `/hud`. |
| `band` | on | The short band above the prompt. Off leaves the pane only. |

Install: see [`../README.md`](../README.md).
