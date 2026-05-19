---
name: forge-retro
description: Build retrospective — synthesizes wiki/build-log.md, wiki/learnings.md, and git history since the last retro into "what shipped, recurring patterns, what to improve next", then files durable lessons and action items back into the wiki. Charter-safe — about craft and process, never velocity or business. Auto-invoked by forge when all plan phases have landed; also standalone anytime. Use when asked "retro", "what did we ship", "what should we do better", or at a natural milestone.
metadata:
  internal: true
---

# forge-retro

Looks back across landed phases and turns scattered build-log/learnings into a
synthesis you can act on. The only forge skill that reasons across the whole arc.

## Charter

The project is worth building and worth doing better each cycle. Retro is about
**craft and process** — patterns in how the work went, what to keep, what to
improve. Never about speed, output volume, "shipping faster", or business value.
"We slowed down to get the hard part right" is a *positive* finding here.

## When it runs

- **Auto:** `forge` invokes this at the **Done** state — every plan phase has a
  build-log entry. (Also fine to run at any milestone.)
- **Standalone:** on demand, scoped to "since the last `wiki/retro.md` entry" (or
  all history if none).

## Process

1. **Gather the arc.** Read `wiki/build-log.md` (phases, gates met),
   `wiki/learnings.md` (review lessons), `wiki/notes/` (incidents), and
   `git log --oneline <base>` since the last retro (one squashed commit per phase —
   that's the intended grain). Optionally diff stats per phase.

2. **Synthesize, don't list.** Produce:
   - **What shipped** — the phases, what each delivered, told as one coherent story
     of the build, not a changelog.
   - **Recurring patterns** — across learnings/incidents: the same class of issue
     showing up (e.g. "three phases needed error-path fixes in review"). Patterns,
     not anecdotes.
   - **What went well** — practices worth keeping; where the discipline paid off.
     Name them so they're reinforced.
   - **What to improve** — concretely, as process changes (e.g. "add an explicit
     concurrency check to forge-build's edge list"), not vague aspiration. Honest
     about friction, never framed as "go faster".
   - **Open threads** — unresolved taste decisions, deferred items still pending.

3. **File it back into the wiki:**
   - Prepend a dated entry to `wiki/retro.md` (the synthesis above, tight).
   - Promote durable lessons into `wiki/learnings.md` (so future builds enforce
     them) and concrete deferrals/action items into `wiki/improvements.md`.
   - Link from `wiki/index.md`. Tell the user exactly what you filed.

4. **Report.** Present the synthesis to the user directly — this is meant to be
   read, not just stored. Lead with the one pattern most worth acting on.

## Rules

- Synthesis over enumeration — if it reads like a commit list, it's not done.
- Charter-safe: craft/process only; never velocity, output count, or business.
- Evidence-based: every claimed pattern cites the phases/learnings it came from.
- Read-and-reflect plus wiki writes only — no feature code, no shipping.
- "Held scope / went slower deliberately" is success, recorded as such.
