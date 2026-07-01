# Interactive design feedback board

The **default** way forge shows design work to the user: a self-contained **HTML
file with a feedback system**. Used by `forge-design-system` (specimen) and
`forge-design-explore` (variants). Replaces "open this static file and tell me in
prose".

## The only hard requirements

Whatever you generate, it must do three things:

1. **Render the design visually** — real content, real text, no lorem, no
   `[chart here]`. The user judges with their eyes.
2. **Collect feedback per section** — a control beside each thing worth reacting to
   (each system part, each variant) so the user can comment on them independently,
   not in one lump.
3. **Copy the feedback back out** — one action that puts all their feedback on the
   clipboard as plain text/markdown, so they paste it straight back to the agent.

Everything else — layout, styling, how many sections, side-by-side vs. stacked,
what the controls look like — **is up to you and the user.** Fit it to the project
and the brief's "How it should feel".

## A ready template (optional)

`forge/assets/feedback-board.html` is a working starting point that already
satisfies all three: tag a `<section data-feedback="NAME">` per thing to react to,
drop the real design inside, and the built-in JS attaches a verdict+comment control
to each and powers a "Copy feedback" button (markdown out, `localStorage`
persistence, works as `file://` or served). Use it, adapt it, or roll your own —
it's a convenience, not a contract.

## Generate-and-open

1. Write the file under `wiki/.forge/` (e.g. `specimen.html`,
   `explore-<surface>.html`).
2. **Serve it and open it — don't just point at the path.** The default recipe,
   verbatim (background the server so it survives the turn):
   ```
   cd wiki/.forge && python3 -m http.server 4173 &
   curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4173/<file>.html   # expect 200
   open "http://127.0.0.1:4173/<file>.html"    # macOS; xdg-open on Linux
   ```
   Report the clickable URL (prefer the machine's reachable host over a raw
   localhost IP when one is set up); if the port is taken, use the next one.
   Opening the raw file is the last resort only when no server can run at all —
   and say so when it happens.
3. Tell the user: react per section, copy the feedback, paste it back here.
4. When they paste it back, fold objective fixes in, surface only genuine taste
   calls, iterate until they're happy, then lock.

## When to skip the HTML entirely

- The surface itself is a terminal/CLI UI → ASCII mockups in `AskUserQuestion`
  are the right form; say so. ("No browser reachable" is **not** a skip reason
  for a visual surface — the *user* opens the served board; the agent never
  needs a browser.)
- The shape is already fixed ("follow `DESIGN.md`") → nothing to explore; exit.
