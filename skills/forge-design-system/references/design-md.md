# DESIGN.md — structure and worked example

`DESIGN.md` lives at the **repo root** (next to the code that must obey it, not
inside `wiki/`) and is the design source of truth. `forge-harden-design` audits
plans against it, `forge-design-explore` generates variants inside it,
`forge-build` implements with its tokens, `forge-polish` treats violations as
objective findings.

Keep it under ~120 lines. It's a contract, not an essay — every line must be
checkable against a rendered screen.

## Structure

```markdown
# Design — <project name>

> **The memorable thing:** <one sentence — what someone remembers after first sight>

## Direction
<name> — <one paragraph: what it feels like, what it would be wrong for>

## Typography
| Role     | Typeface          | Weights        | Notes                        |
|----------|-------------------|----------------|------------------------------|
| Display  | <name>            | <e.g. 700/900> | <where it appears>           |
| Body     | <name>            | <400/500/600>  | <line-height stance>         |
| Code/data| <name>            | <400/700>      | tabular-nums for aligned data|

Anti-defaults: no `system-ui` as personality; <any project-specific bans>.

## Color
Philosophy: <one line — where color is spent, where it is withheld>

| Token     | Value     | Use                       |
|-----------|-----------|---------------------------|
| bg        | <value>   | page background           |
| surface   | <value>   | cards, panels             |
| text      | <value>   | primary text (AA on bg)   |
| muted     | <value>   | secondary text            |
| accent    | <value>   | <the rare, meaningful use>|
| danger    | <value>   | destructive only          |

## Spacing
4px base. Steps: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Components use steps,
never raw values.

## Radius
controls <value> · cards <value> · pills <value>. Nothing else.

## Motion
micro ~100ms · short ~150ms · medium ~250ms · long ~400ms. Easing: <stance>.
`prefers-reduced-motion`: <behavior>.

## Voice
<three adjectives>. Empty-state example: "<a real one, in the voice>"

## Anti-patterns (objective findings in forge-polish)
- Off-scale spacing or unnamed colors
- <direction-specific bans — e.g. "no gradients", "no decorative icons">

## Decisions
[[wiki/decisions/NNNN-design-system]] — direction rationale + alternatives
```

## Worked example (a local-first photo dedupe tool, "calm utility" direction)

```markdown
# Design — dedupe

> **The memorable thing:** it shows you exactly what it's about to delete —
> side by side, byte counts and all — before it touches anything.

## Direction
Calm utility — a tool that feels like a careful archivist, not a cleanup
blitz. Dense where data needs density, silent everywhere else. Wrong for:
anything that wants to feel fun.

## Typography
| Role     | Typeface       | Weights | Notes                          |
|----------|----------------|---------|--------------------------------|
| Display  | Space Grotesk  | 700     | headings + the big reclaim number |
| Body     | Source Sans 3  | 400/600 | 1.5 line-height                |
| Code/data| JetBrains Mono | 400/700 | paths, hashes, sizes; tabular-nums |

Anti-defaults: no system-ui as personality; no italic anywhere.

## Color
Philosophy: the interface is grayscale; only *data that demands a decision*
gets color. Green is reserved for "space reclaimed".

| Token   | Value   | Use                            |
|---------|---------|--------------------------------|
| bg      | #FAFAF8 | page                           |
| surface | #FFFFFF | comparison cards               |
| text    | #1A1A18 | primary                        |
| muted   | #6B6B66 | metadata                       |
| accent  | #1F7A33 | reclaimed bytes, success only  |
| danger  | #B3261E | the delete action, nothing else|
```

(…remaining sections per the structure above.)

The example's value is its *restraint*: every token has a stated job, and the
anti-patterns make violations checkable rather than arguable.
