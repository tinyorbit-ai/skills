---
name: forge-ambition
description: Ambition check — pressure-tests whether you're building the most ambitious version of the thing YOU already chose to build. Challenges self-imposed limits and timid premises; the boldness it argues for is about craft and intent, never market upside. Auto-invoked by forge-discovery before the brief locks; also standalone. Use when asked "am I thinking big enough", "challenge this", "ambition check", or when a brief/plan feels smaller than it could be.
---

# forge-ambition

Pressure-tests one question: *are you building the boldest version of the thing
you chose?*

## Charter (hard boundary)

This skill **only** pushes ambition within the intent the user already chose — the
boldness it argues for is about craft and intent, never about market upside
(`forge-principles`'s `references/charter.md`).

## What it does

Run after a brief is drafted (or on demand against brief/plan). Read
`forge-principles`'s `references/charter.md`, `wiki/brief.md`, and `wiki/plan.md` if
it exists.

1. **Find the timid premises.** Where has the user unconsciously shrunk the idea?
   Look for: "just a simple…", "only…", "for now…", "v1 is minimal", defaults
   chosen for ease not for the vision, a hard part avoided rather than embraced.
   List them plainly.

2. **Describe the bolder version — maximal outcome, minimal machinery.** For the
   same intent and audience, what's the version that fully honors what makes this
   interesting — the harder/cleaner/more complete realization? The boldest version
   does the most with the *fewest* parts; a "bolder" idea that needs a heavier
   system is usually a weaker idea wearing ambition. Push the outcome, not the part
   count. Be concrete. Tie it to *their* stated goal and the feel they wanted, never
   to reach/scale/revenue. One or two vivid paragraphs, not a roadmap.

3. **Stack the small unlocks.** Separate from the one bolder version: rapid-fire
   **2–4 small ideas**, each independently adoptable and cheap relative to the
   build (hours, not weeks), each making the thing more *delightful to its own
   user* — the kind you'd show someone. Stack them fast and vivid, not as a
   strategy memo:

   > Structured (avoid): "Consider adding an export feature. This would improve
   > the tool's utility."
   >
   > Stacked (aim for): "Oh — and what if the dedupe run ended with a one-line
   > 'reclaimed 4.2 GB' summary? Or wrote an undo script alongside? Or showed the
   > worst duplicate side-by-side before deleting? Each is a small unlock; any of
   > them turns 'a script I ran' into 'a tool I trust'."

   Lead with the fun; let the user edit it down. Same intent, same audience —
   never a new feature direction smuggled in as delight.

4. **Name the cost honestly.** What the bolder version actually takes (effort,
   difficulty, the hard part they'd have to face). No selling. The user decides
   whether the extra ambition is worth *their* time and interest — the only
   currency here. For the bolder version and **each** small unlock, also name:

   - **Added proof burden** — the new observable evidence needed to trust or ship
     it, not merely the implementation work.
   - **Paired cut or pressure valve** — what existing work leaves scope, or the
     explicit trigger and fallback that lets this expansion slip without putting
     the core outcome at risk. "We'll fit it in" is not a pressure valve.

5. **Offer it as choices.** The bolder version: one AskUserQuestion in the
   **Decision Brief** shape (forge suite's `references/question-style.md`) —
   keep the current shape, adopt the bolder version, or take specific pieces.
   The small unlocks: one `multiSelect` AskUserQuestion where each unlock is an
   option the user cherry-picks (with its one-line cost) — adopted ones land in
   the brief, rejected ones go to `wiki/improvements.md` as parked, not deleted.
   Put each option's proof burden and paired cut/pressure valve in its description;
   an expansion missing either is not ready to offer.
   Take a position on both — but the timid version is a fully legitimate
   choice. "I want it small" ends it.

6. **Record the outcome — with a named marker.** Always write a one-line
   `**Ambition check (YYYY-MM-DD):** <held as-is | raised — what changed>` into
   `wiki/brief.md` (a stable, greppable marker `forge-harden-scope` reads so it
   doesn't re-litigate this). If ambition changed: also update the relevant body
   sections of the brief (and the relevant ADR / `wiki/plan.md` if it exists) and
   record the adopted proof burden plus cut/pressure valve beside it. If unchanged,
   the marker records that scope was deliberately
   held — a decision worth keeping so it isn't reopened later.

## Rules

- One register: enthusiasm for the *craft*, never persuasion toward *bigger for
  bigger's sake* and never toward a market.
- "Smaller on purpose" is a valid, respected answer — accept it without erosion.
- Never introduce a new audience, monetization, or growth angle. Same thing, bolder.
- Don't redesign the architecture here — that's `forge-plan`/`forge-harden`. This
  is about the *intent's* ambition, not the implementation.
