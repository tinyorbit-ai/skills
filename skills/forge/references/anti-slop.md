# Anti-slop — the named blacklist

The generic-AI-design patterns forge treats as defects. **Enforced at two points:**
at *generation* (`forge-design-explore` variants, `forge-design-system` specimen —
a mockup that hits a pattern is regenerated, never shown; the user must never pick
from slop) and at *runtime QA* (`forge-polish` — each hit on a built surface is an
objective finding to fix).

## The blacklist

1. Purple/violet/indigo gradients or blue-to-purple schemes as default mood
2. The 3-column feature grid — icon-in-colored-circle + bold title + two-line
   description, repeated symmetrically
3. Icons in colored circles as section decoration
4. Centered-everything (headings, body, cards all `text-align: center`)
5. One uniform bubbly border-radius on every element
6. Decorative blobs, floating circles, wavy SVG section dividers
7. Emoji as design elements (rockets in headings, emoji bullets)
8. Colored left-border accent on cards
9. Generic hero copy ("Welcome to X", "Unlock the power of…", "Your all-in-one
   solution")
10. Cookie-cutter section rhythm — hero → 3 features → testimonials → CTA, every
    section the same height
11. `system-ui`/`-apple-system` as the *personality* font — the
    gave-up-on-typography signal

## Mechanical sub-check — run it, don't eyeball it

Patterns 1, 5, 7, and 11 are grep-able in source or mockup code: purple-hued
`linear-gradient` values, one global `border-radius`, emoji inside heading markup,
`font-family: system-ui`/`-apple-system` on display elements. Check those
mechanically. Patterns 2, 3, 4, 6, 8, 10 need a visual/DOM read; 9 is a copy
read. State which sub-check ran — a blacklist "pass" with no named method is a
skipped check.

## At generation (design-explore, design-system)

Before presenting variants or a specimen, check every one against the list. A hit
means regenerate that variant/section — the board the user reacts to is already
clean. Pair it with the **differentiation check**: if two variants share the same
layout skeleton, they are one variant — regenerate the duplicate on a genuinely
different axis.

## At runtime (polish)

Each hit is a numbered objective finding, fixed in source with before/after
evidence, under `forge-polish`'s loop and exit bar (slop ≥ 9, design ≥ 8).
