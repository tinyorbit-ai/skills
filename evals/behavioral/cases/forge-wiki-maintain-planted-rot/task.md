This repo's wiki has accumulated rot after a run of ingests.

Use the forge-wiki skill (read .claude/skills/forge-wiki/SKILL.md and follow its
MAINTAIN mode) to run a full health pass **with --fix**.

This is a NON-INTERACTIVE run: where the skill would offer choices or surface
structural candidates for a decision, report them in the health report and your
summary — do not call AskUserQuestion, do not wait. Respect the skill's own line:
--fix applies only the safe fixes; structural issues are reported, never
auto-applied.
