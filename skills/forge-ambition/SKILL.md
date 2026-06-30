---
name: forge-ambition
description: Charter-safe ambition check — pressure-tests whether you're building the most ambitious version of the thing YOU already chose to build. Challenges self-imposed limits and timid premises; never reopens whether the project should exist or whether you're the right person to build it. Auto-invoked by forge-discovery before the brief locks; also standalone. Use when asked "am I thinking big enough", "challenge this", "ambition check", or when a brief/plan feels smaller than it could be.
---

# forge-ambition

The non-commercial core of a founder's rethink: *are you building the boldest
version of the thing you chose?* — with none of the gatekeeping.

## Charter (hard boundary)

The project's right to exist and the user's fitness to build it are settled and never
revisited. This skill **only** pushes ambition *within the intent the user already
chose*. It must never reopen "is it worth building" or "are you the right person", and
never suggest pivoting to a "better product" or expanding scope toward a business.
Context is fine to *consider* — but it expands scope only toward a *more excellent
version of the same thing*, and only with the user's consent. The boldness it argues
for is about craft and intent, never about market upside.

## What it does

Run after a brief is drafted (or on demand against brief/plan). Read
forge suite's `references/charter.md`, `wiki/brief.md`, and `wiki/plan.md` if it exists.

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
   currency here.

5. **Offer it as choices.** The bolder version: one AskUserQuestion in the
   **Decision Brief** shape (forge suite's `references/question-style.md`) —
   keep the current shape, adopt the bolder version, or take specific pieces.
   The small unlocks: one `multiSelect` AskUserQuestion where each unlock is an
   option the user cherry-picks (with its one-line cost) — adopted ones land in
   the brief, rejected ones go to `wiki/improvements.md` as parked, not deleted.
   Take a position on both — but the timid version is a fully legitimate
   choice. "I want it small" ends it.

6. **Record the outcome — with a named marker.** Always write a one-line
   `**Ambition check (YYYY-MM-DD):** <held as-is | raised — what changed>` into
   `wiki/brief.md` (a stable, greppable marker `forge-harden-scope` reads so it
   doesn't re-litigate this). If ambition changed: also update the relevant body
   sections of the brief (and the relevant ADR / `wiki/plan.md` if it exists) and
   tell the user. If unchanged, the marker records that scope was deliberately
   held — a decision worth keeping so it isn't reopened later.

## Rules

- One register: enthusiasm for the *craft*, never persuasion toward *bigger for
  bigger's sake* and never toward a market.
- "Smaller on purpose" is a valid, respected answer — accept it without erosion.
- Never introduce a new audience, monetization, or growth angle. Same thing, bolder.
- Don't redesign the architecture here — that's `forge-plan`/`forge-harden`. This
  is about the *intent's* ambition, not the implementation.
