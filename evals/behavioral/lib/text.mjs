// Markdown text helpers shared by the deterministic plan graders.
//
// Why this exists: the tripwire and anti-pattern sweeps ask "does this line name
// a banned thing WITHOUT rejecting it?" — a per-line negation test. But plans are
// hard-wrapped at ~80 columns, so one logical statement routinely spans two or
// three physical lines and the negation lands on a different line than the term:
//
//     Deliberately **not** built, with reasons in [[improvements]]: undo command,
//     sidecar provenance ledger, concurrency pool, watch mode, config file, ...
//
// Line 1 carries "not" and is correctly ignored. Line 2 carries "config file" with
// no negation in sight and is flagged as speculative machinery — a false positive
// on a plan that is doing exactly the right thing. Observed live on 2026-07-25
// across four runs and both graders; it inflated the failure rate on both sides of
// a baseline comparison and very nearly read as a regression.
//
// Fix: reflow the hard wrap before grading, so a "line" means a logical statement.

const STARTS_BLOCK =
  /^\s*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|\||>|```|\*\*[^*]+:\*\*|$)/;

/**
 * Join hard-wrapped continuation lines so each returned entry is one logical
 * statement. A line continues the previous one unless it opens a new block
 * (heading, bullet, numbered item, table row, quote, fence, **Key:** field, or
 * a blank line).
 */
export function logicalLines(text) {
  const out = [];
  for (const raw of String(text ?? '').split('\n')) {
    if (out.length > 0 && !STARTS_BLOCK.test(raw) && raw.trim() !== '') {
      out[out.length - 1] += ` ${raw.trim()}`;
    } else {
      out.push(raw);
    }
  }
  return out;
}

/**
 * The plan is rejecting the thing, not building it. Kept deliberately wide: a
 * missing synonym reads as an invented feature and fails a good plan. "the brief
 * bans config files" was flagged live on 2026-07-25 purely because `bans` was
 * absent from this list.
 */
export const NEGATION =
  /\bno\b|\bnot\b|\bnothing\b|\bnone\b|never|avoid|reject|out of scope|non-goal|denied|deferred|absent|instead of|rather than|without|\bbans?\b|banned|forbid|prohibit|exclude|rules? out|ruled out|precludes?|omit|drop(?:ped)?|declined|skip(?:ped)?|unsupported|\bn\/a\b/i;

/**
 * The term appears in a sense that is not a product feature — most often a shell
 * command in a gate. "git log … returns nothing across the full history" is not a
 * history *feature*, and `--config` on someone else's CLI is not a config surface
 * this project ships. Observed live: a mandated secret-scanning bullet tripped the
 * stats/history tripwire on the word "history".
 */
export const NON_FEATURE_SENSE =
  /git\s+(log|history|rev-list|blame|grep)|commit history|version history|shell history|`[^`]*\b(git|grep|npm|node)\b[^`]*`/i;

// A phase block's fields split into two kinds. Only the first kind states what
// gets BUILT; the second reasons about the build and may legitimately name a
// non-goal in order to rule it out.
const OBLIGATION_FIELDS = ['Goal', 'Verifiable gate', 'Work'];

/**
 * The part of a phase block that expresses build obligations — Goal, Verifiable
 * gate, Work — with the reasoning fields (Risks retired, Human evidence gate,
 * Decisions, Branch, Design) dropped.
 *
 * The tripwires were always scoped this way in intent: their own comment says
 * architecture prose may name a banned feature to reject it, but "a phase's
 * Goal/Work/Gate naming one means it's being BUILT". Scoping to the whole phase
 * block was a stand-in that held only while phase blocks contained nothing but
 * obligations. PR #16 added `Risks retired:` and `Human evidence gate:` inside
 * the block, and "The terminal bell is a sufficient notification" — a hypothesis
 * being retired — immediately read as a notification feature.
 */
export function obligationText(phaseBlock) {
  const lines = String(phaseBlock ?? '').split('\n');
  const out = [];
  let keeping = false;
  for (const line of lines) {
    const field = line.match(/^\s*\*\*([^*:]+):?\*\*/);
    if (field) keeping = OBLIGATION_FIELDS.some((f) => f.toLowerCase() === field[1].trim().toLowerCase());
    if (keeping) out.push(line);
  }
  return out.join('\n');
}

/**
 * Lines that match `hitRe` and are suppressed by none of `suppressors`.
 * Suppressors are applied to the whole logical statement, so a lead-in like
 * "Deliberately not built:" covers the wrapped list it introduces.
 */
export function unnegatedHits(text, hitRe, suppressors = [NEGATION, NON_FEATURE_SENSE]) {
  const all = Array.isArray(suppressors) ? suppressors : [suppressors];
  return logicalLines(text).filter((l) => hitRe.test(l) && !all.some((re) => re.test(l)));
}
