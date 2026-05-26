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

2. **Audit with a designer's eye.** Capture screenshots, then look for:
   - **Consistency:** spacing scale honored? aligned edges? consistent radii,
     shadows, weights, colors from one system — or ad-hoc values?
   - **Hierarchy:** does the eye land on the right thing first? Is emphasis earned?
   - **Rhythm & density:** vertical rhythm, balanced whitespace, no cramped or
     orphaned elements; optical alignment, not just pixel alignment.
   - **AI-slop tells:** generic centered card-on-gradient, purple defaults,
     emoji-as-icons, unrelated stock spacing, three-equal-cards filler, lorem feel.
     Name them; they're findings.
   - **States:** hover/focus/active/disabled/loading/empty/error actually designed,
     not default-browser or missing.
   - **Motion & feel:** interactions snappy; transitions purposeful, not laggy or
     gratuitous. Note anything that *feels* slow.

3. **Fix in source.** Objective inconsistencies (off-scale spacing, broken
   alignment, missing states, slop patterns) → fix in the code on the current phase
   branch, re-verify visually, capture **before/after** screenshots. Subjective
   taste calls → one AskUserQuestion batch in the **Decision Brief** shape
   (forge suite's `references/question-style.md`): concrete framing, named
   stakes, recommendation with the *why*.

4. **Capture.** Append a `wiki/learnings.md` entry with the rule-to-remember
   (e.g. "use the spacing scale token, never raw px") so `forge-build` prevents it
   next time. Tell the user. Show the before/after evidence.

## Rules

- Evidence or it didn't happen — every fix has before/after screenshots.
- Fix objective issues automatically; surface only genuine taste.
- Stay on the phase branch; never ship (that's `forge-ship`).
- Polish the craft, not "conversion" — no market/persuasion framing.
- Respect an existing design system / `DESIGN.md` if present; align to it, don't
  reinvent it.
