# Discovery questions — push gates and red flags

Companion to `forge-discovery/SKILL.md`. The SKILL lists the questions; this
defines, per question, **what "specific enough" sounds like** (push until you
hear it) and **what a vague answer sounds like** (red flags — push once more,
per `forge-principles`'s `references/voice.md`: push once, then push again, never
a third time).

Every gate pushes on **specificity and observed reality** — never on demand,
worth, or justification. *"I don't know yet — I'll learn by building"* clears any
gate instantly — record it as an open question and move on.

## Base seven

**What is it?**
Push until: a sentence whose subject is the *thing* doing something — "a CLI
that watches a folder and dedupes photos as they land".
Red flags: a category ("a productivity tool"), a technology ("an AI app"), or
a feature list with no spine.

**Who uses it, and when?**
Push until: a person in a *moment* — what they were doing right before, what
they do right after. "Me, Sunday night, after importing a camera card" beats
any segment.
Red flags: "users", "people who…", any plural with no scene attached.

**How should it feel?**
Push until: either a felt quality tied to a moment ("instant — the result is
there before doubt sets in") or a named reference ("like ripgrep — output so
clean you trust it"). One reference beats three adjectives.
Red flags: "clean, modern, simple" — adjectives doing no work. Counter-push:
"name a thing that already feels this way; I'll extract what's doing the work."

**What's the hard or interesting part?**
Push until: a *specific* knot — "perceptual hashing near-duplicates without
false positives", not "getting it right".
Red flags: "nothing really, it's mostly straightforward" (then why is it
interesting to build? — there's usually a knot hiding; one push to find it,
then accept), or a list of five hard parts (push to rank: which one decides
the architecture?).

**Constraints.**
Push until: testable statements — "must run offline", "Python because that's
the codebase", "single binary".
Red flags: preferences disguised as constraints ("should probably use X") —
split them: which are fixed, which are defaults you're free to challenge later?

**Non-goals.**
Push until: at least two real exclusions someone might plausibly expect — "no
cloud sync", "no GUI in v1, ever".
Red flags: an empty list ("it could do anything!") — that's the scope-drift
seed; push for the two most tempting things it will *not* do.

**Alternatives & prior art.**
Push until: a named existing thing and the *shape* reason it doesn't fit —
"dupeGuru exists; it's GUI-first and I want this in my pipeline".
Red flags: "nothing like this exists" (almost never true at the shape level —
one push: "what's the *closest* thing, even if it's bad?"). Design context
only; never "why competitors lose".

## Sharpening six

**The specific moment.**
Push until: filmable — actor, trigger, action, result.
Red flags: a moment that's secretly a persona ("when developers need to…").

**The friction it replaces.**
Push until: the current workaround, step by step, with the annoying part
named — measured in effort/attention, never money.
Red flags: "there's no current way" when the base-seven said otherwise; "it
just saves time" with no scene.

**The smallest version that's already useful.**
Push until: something runnable in days whose output the user would genuinely
use that week.
Red flags: "it only makes sense with all the pieces" — that's attachment to
the architecture, not the value; push: "if you could only keep one workflow,
which?"

**Watched anyone do it the current way?** *(observation — the gate is surprise)*
Push until: an observed scene — themselves or someone else actually doing the
thing this replaces — and **one thing that surprised them** about it.
Red flags: "I know how it goes" without having watched; "nothing surprising"
(usually means not looking closely — one push: "what did the last run of this
actually look like?"). If they genuinely haven't watched: note it as a phase-1
follow-up ("do the thing manually once before building the automation"), not
a blocker.

**What you're most drawn to — or most unsure about.**
Push until: a *part* of the thing, named ("the undo script", "whether the
hash threshold is tunable").
Red flags: "all of it equally" — one push: "which part would you demo first?"

**Three-year fit.** *(optional color — never a required turn)*
Push until: a direction with a reason — "more essential: it becomes my photo
pipeline's front door" / "archived: the itch is the build itself".
Red flags: none — all answers are valid here, and on a budgeted one-liner run
(SKILL §1c) skipping it entirely is fine.
