---
name: forge-polish
description: Designer's-eye QA on the running build — finds visual inconsistency, broken spacing rhythm, weak hierarchy, generic "AI-slop" patterns, and sluggish interactions, then fixes them in source with before/after evidence. Auto-invoked by forge-review when the phase touched UI; also standalone. Use when asked to "polish the UI", "design QA", "make it look right", "visual audit", or after shipping a UI phase.
metadata:
  internal: true
---

# forge-polish

The designer's eye on the *running* thing (not the plan — that's `forge-harden`).
Catches what static review can't see: how it actually looks and feels.

## Charter

The project is worth building and worth making feel crafted. Polish is about taste
and coherence, never about market appeal or conversion. Make it feel intentional.

## When it runs

- **Auto:** `forge-review`'s runtime pass invokes this when the phase diff touched
  UI. Scoped to what the phase changed.
- **Standalone:** invoked directly to audit a screen/flow on demand (full surface).

If there's no UI in scope, say so and exit — nothing to do.

## Process

1. **Run it.** Launch the app with the project's tooling / browser automation.
   Navigate the phase's screens/flows at real viewport sizes (mobile + desktop at
   minimum). Read `wiki/learnings.md` first — past visual rules are enforced here.

2. **Baseline, then audit with a designer's eye.** Capture screenshots, then
   score **design coherence 0–10** and **slop 0–10** (10 = none detected) as the
   baseline per forge suite's `references/scoring.md`, then look for:
   - **Consistency:** spacing scale honored? aligned edges? consistent radii,
     shadows, weights, colors from one system (`DESIGN.md` tokens if present) —
     or ad-hoc values?
   - **Hierarchy:** does the eye land on the right thing first? Is emphasis earned?
   - **Rhythm & density:** vertical rhythm, balanced whitespace, no cramped or
     orphaned elements; optical alignment, not just pixel alignment.
   - **AI-slop tells** — the named blacklist; each hit is a finding:
     1. Purple/violet/indigo gradients or blue-to-purple schemes as default mood
     2. The 3-column feature grid — icon-in-colored-circle + bold title +
        two-line description, repeated symmetrically
     3. Icons in colored circles as section decoration
     4. Centered-everything (headings, body, cards all `text-align: center`)
     5. One uniform bubbly border-radius on every element
     6. Decorative blobs, floating circles, wavy SVG section dividers
     7. Emoji as design elements (rockets in headings, emoji bullets)
     8. Colored left-border accent on cards
     9. Generic hero copy ("Welcome to X", "Unlock the power of…",
        "Your all-in-one solution")
     10. Cookie-cutter section rhythm — hero → 3 features → testimonials → CTA,
        every section the same height
     11. `system-ui`/`-apple-system` as the *personality* font — the
        gave-up-on-typography signal
   - **States:** hover/focus/active/disabled/loading/empty/error actually designed,
     not default-browser or missing.
   - **Motion & feel:** interactions snappy; transitions purposeful, not laggy or
     gratuitous. Note anything that *feels* slow.

3. **Fix in source.** Objective inconsistencies (off-scale spacing, broken
   alignment, missing states, slop patterns) → fix in the code on the current phase
   branch, re-verify visually. Number every finding (`finding-001`, …) and pair
   its evidence by number — `finding-001-before.png` / `finding-001-after.png`.
   Subjective taste calls → one AskUserQuestion batch in the **Decision Brief**
   shape (forge suite's `references/question-style.md`): concrete framing, named
   stakes, recommendation with the *why*.

4. **Capture and re-score.** Re-rate both scores after fixes and report the
   deltas ("design 5→8, slop 6→10") — a polish run whose scores didn't move
   either found a clean build (say so) or didn't finish. Append a
   `wiki/learnings.md` entry with the rule-to-remember (e.g. "use the spacing
   scale token, never raw px") so `forge-build` prevents it next time. Tell the
   user. Show the numbered before/after evidence.

## Rules

- Evidence or it didn't happen — every fix has numbered before/after screenshots.
- Fix objective issues automatically; surface only genuine taste.
- Stay on the phase branch; never ship (that's `forge-ship`).
- Polish the craft, not "conversion" — no market/persuasion framing.
- Respect an existing design system / `DESIGN.md` if present (see
  `forge-design-system`); off-system values are objective findings, not taste.

## References

- forge suite's `references/scoring.md` — baseline → final score deltas
- forge suite's `references/question-style.md` — Decision Brief format
- `forge-design-system` — the DESIGN.md contract this enforces at runtime
