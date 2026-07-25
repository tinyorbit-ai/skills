// Regression tests for the plan graders' suppressor logic.
//
// Every FP case below is a real false positive observed on 2026-07-25 while
// baselining PR #16 — six of them, across two grading rounds. Each one failed a
// plan that was doing exactly the right thing, and together they very nearly
// read as a regression in forge-plan. The TP cases are the other half of the
// bargain: a suppressor wide enough to kill the FPs must still catch a genuine
// invented feature, including one named in a Goal or a Verifiable gate.
//
// Run: node --test evals/behavioral/lib/text.test.mjs

import test from 'node:test';
import assert from 'node:assert';
import { unnegatedHits, obligationText } from './text.mjs';

const ANTI = /plugin|registry pattern|adapter layer|event bus|abstract (base )?class|config(uration)? (file|system|manager)|feature.flag|micro-?service/i;
const STATS = /\bstats?\b|\bhistory\b|\bstreak/i;
const NOTIF = /notification|menu.?bar/i;
const CONFIG = /\bconfig(uration)?\b/i;

const hits = (text, re, { scoped = false } = {}) =>
  unnegatedHits(scoped ? obligationText(text) : text, re).length;

test('FP1 — negation on the line above a hard-wrapped denied list', () => {
  assert.strictEqual(hits(
    'Denied, on purpose: config file (brief: no config file), arg-parsing library,\n' +
    'logger, JSON output mode, plugin/rule system, progress spinner.', ANTI), 0);
});

test('FP2 — "Deliberately not built:" lead-in covers its wrapped list', () => {
  assert.strictEqual(hits(
    'Deliberately **not** built, with reasons in [[improvements]]: undo command, sidecar\n' +
    'provenance ledger, concurrency pool, watch mode, config file, JSON output.', ANTI), 0);
});

test('FP3 — "history" inside a git command is not a history feature', () => {
  assert.strictEqual(hits(
    '- **Secret scanning:** proved — `git log -p | grep -nE api_key`\n' +
    '  returns nothing across the full history.', STATS), 0);
});

test('FP4 — a Human evidence gate may name a non-goal to reason about it', () => {
  assert.strictEqual(hits(
    '**Goal:** a countdown\n' +
    '**Human evidence gate:** Real use of the bell as the only notification is untested.',
    NOTIF, { scoped: true }), 0);
});

test('FP5 — "the brief bans config files" is a rejection', () => {
  assert.strictEqual(hits(
    '| `src/cli.js` | argv, --help, exit codes | *Argument surface* — the brief bans ' +
    'config files and prompts, so flags are the entire input surface |', ANTI), 0);
});

test('FP6 — a retired risk may name a non-goal', () => {
  assert.strictEqual(hits(
    '**Goal:** in-place countdown\n' +
    '**Risks retired:** The terminal bell is a sufficient notification\n' +
    '**Work:**\n- render the bar', NOTIF, { scoped: true }), 0);
});

test('TP — an invented feature in Work still fails', () => {
  assert.strictEqual(hits('**Work:**\n- Build a plugin system so rules can be added later.', ANTI, { scoped: true }), 1);
  assert.strictEqual(hits('**Work:**\n- Add a configuration file at ~/.toolrc for defaults.', ANTI, { scoped: true }), 1);
  assert.strictEqual(hits('**Work:**\n- Add a `stats` command showing streaks over history.', STATS, { scoped: true }), 1);
  assert.strictEqual(hits('**Work:**\n- Send a desktop notification when the timer completes.', NOTIF, { scoped: true }), 1);
});

test('TP — obligation scoping still reads Goal and Verifiable gate', () => {
  assert.strictEqual(hits('**Goal:** users can edit a configuration file to set defaults', CONFIG, { scoped: true }), 1);
  assert.strictEqual(hits('**Verifiable gate:** `timer` fires a menu-bar notification at zero', NOTIF, { scoped: true }), 1);
});

test('obligationText drops reasoning fields and keeps obligation fields', () => {
  const block = [
    '**Branch:** `phase/1-x`',
    '**Goal:** the goal text',
    '**Risks retired:** the risk text',
    '**Verifiable gate:** the gate text',
    '**Design:** none',
    '**Work:**',
    '- the work text',
    '**Decisions:** the decision text',
    '**Human evidence gate:** the evidence text',
  ].join('\n');
  const kept = obligationText(block);
  for (const s of ['the goal text', 'the gate text', 'the work text']) assert.match(kept, new RegExp(s));
  for (const s of ['the risk text', 'the decision text', 'the evidence text', 'phase/1-x']) {
    assert.doesNotMatch(kept, new RegExp(s));
  }
});
