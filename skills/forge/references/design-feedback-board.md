# Interactive design feedback board

The **default** way forge shows design work to the user: a self-contained HTML
page that renders the design *visually*, lets the user react **per section**, and
copies all their feedback back as one structured markdown blob to paste to the
agent. Used by `forge-design-system` (specimen) and `forge-design-explore`
(variants side-by-side). Replaces "open this static file and tell me in prose".

## Why this is the default

The user wants to **see** the output, not read adjectives — and to give targeted
feedback on each piece without writing an essay. ASCII-in-`AskUserQuestion` is the
fallback only when there is genuinely no browser (pure terminal/SSH) or the surface
is itself a CLI. For anything web/visual, generate the board.

## The template

`forge/assets/feedback-board.html` — copy it, fill it, open it. It is
self-contained (works as `file://` or served) and needs no build step. The JS at
the bottom is fixed infrastructure; **do not edit below the `END TEMPLATE CONTENT`
marker.** You only author:

1. `<title>`, `.board-title`, `.board-sub` (what the user is reacting to).
2. The `<main id="sections">` body — one `<section data-feedback="NAME">` per
   thing to react to. `NAME` is the label that appears in the copied feedback.
   Put the **real rendered design** inside each section's `.sec-body` — real text,
   real components, real palette in use. No lorem, no `[chart here]`.
3. Add `class="cols"` to `<main>` for a side-by-side compare (design-explore's
   variants); omit it for a stacked specimen (design-system).

The board auto-attaches to every `[data-feedback]` section: a verdict chip row
(**Love it / It's fine / Needs work**) + a free-text box, persisted to
`localStorage`, plus a sticky **Copy feedback** button. The user clicks Copy and
pastes the result back — the agent reads it as structured markdown:

```
## Design feedback — <project>
### Typography  —  🔧 Needs work
the mono is too wide, try a narrower data face
### Color  —  👍 Love it
```

## Generate-and-open contract

1. Write the filled board to `wiki/.forge/specimen.html` (design-system) or
   `wiki/.forge/explore-<surface>.html` (design-explore).
2. **Open it for the user — don't just point at the path.** Per Matt's global
   rule, prefer spinning up a small local static server and reporting a clear URL
   (use the machine's reachable host, not a raw localhost IP, when one is set up)
   rather than telling the user to open a file. A one-liner like
   `python3 -m http.server` from the file's directory is fine; report the exact
   URL ready to click. If serving isn't possible, fall back to opening the file.
3. Tell the user: react per section, hit **Copy feedback**, paste it back here.
4. When they paste it back, parse the markdown, fold objective fixes in, and
   surface only genuine taste calls. Iterate until they're happy, then lock.

## When to skip the board

- Pure CLI/terminal surface with no visual component → ASCII mockups in
  `AskUserQuestion` (design-explore's fallback) are correct.
- No browser reachable at all → fall back to the static/ASCII path and say so.
- The shape is already fixed (e.g. "follow DESIGN.md exactly") → no exploration
  to show; say so and exit.
