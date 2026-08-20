#!/usr/bin/env node
// Tier 1b — routing evals for maximum-effort. The `## Triage` and `## When not to run`
// sections of SKILL.md are the rule; this suite asserts that a cheap model applying ONLY
// those sections sizes each task (S/M/L), sets its worker floor (sonnet|opus), and stands
// down for forge (`tag: "forge"`, expects the single word `forge`) the way the rule
// intends. Pass: ≥ n-1 overall AND two hard constraints — no `routine` case floors at
// opus, every `hard` case does. The sections are read live, so editing the rule and
// re-running shows routing regressions immediately.
//
// Run:  node evals/routing/run.mjs [--dry-run] [--only <substring>]
// Env:  EVAL_ROUTING_MODEL (default claude-haiku-4-5-20251001), EVAL_CONCURRENCY (default 4)

import { readFileSync, existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
const ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const MODEL = process.env.EVAL_ROUTING_MODEL || 'claude-haiku-4-5-20251001';
const CONCURRENCY = Number(process.env.EVAL_CONCURRENCY || 4);
const dryRun = process.argv.includes('--dry-run');
const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx !== -1 ? process.argv[onlyIdx + 1] : null;

// Promotion-proof: the skill is read from wherever it lives today.
const skillPath = ['skills/maximum-effort/SKILL.md', 'skills/.experimental/maximum-effort/SKILL.md']
  .map((p) => join(ROOT, p))
  .find((p) => existsSync(p));
if (!skillPath) {
  console.error('maximum-effort SKILL.md not found');
  process.exit(1);
}
const skill = readFileSync(skillPath, 'utf8');
const triage = skill.match(/^## Triage\n([\s\S]*?)(?=^## )/m)?.[1]?.trim();
if (!triage) {
  console.error(`no "## Triage" section in ${skillPath}`);
  process.exit(1);
}
const standDown = skill.match(/^## When not to run\n([\s\S]*?)(?=^## )/m)?.[1]?.trim();
if (!standDown) {
  console.error(`no "## When not to run" section in ${skillPath}`);
  process.exit(1);
}

function buildPrompt(task) {
  return [
    'You are applying a triage rule to one task. First, the rule for when NOT to run at all, verbatim:',
    '',
    standDown,
    '',
    'Then the size/floor triage rule, verbatim (only applies if the above does not say to stand down):',
    '',
    triage,
    '',
    `Task: "${task}"`,
    '',
    'If the "When not to run" rule says forge owns this and you should stand down, reply with exactly',
    'one word and nothing else: forge.',
    'Otherwise, reply with exactly two words and nothing else: the size (S, M or L) and the worker floor (sonnet or opus).',
    'The floor is opus only when at least one step is risky as the rule defines it; otherwise sonnet.',
  ].join('\n');
}

let { cases } = JSON.parse(readFileSync(join(ROOT, 'evals/routing/cases.json'), 'utf8'));
if (only) cases = cases.filter((c) => c.task.toLowerCase().includes(only.toLowerCase()));

if (dryRun) {
  console.log(buildPrompt(cases[0].task));
  console.log(`\n--dry-run: ${cases.length} cases, model ${MODEL}, skill ${skillPath.replace(ROOT + '/', '')}`);
  process.exit(0);
}

async function judgeCase(c) {
  try {
    const { stdout } = await execFileP('claude', ['-p', buildPrompt(c.task), '--model', MODEL], { timeout: 120_000, env: process.env });
    const answer = stdout.trim().split('\n').pop().replace(/[`"'.,]/g, '').trim();
    if (/^forge$/i.test(answer)) {
      const pass = c.expectForge === true;
      return { ...c, answer: 'forge', size_got: 'forge', floor_got: 'forge', pass };
    }
    const size = answer.match(/\b([SML])\b/)?.[1] ?? '?';
    const floor = answer.match(/\b(sonnet|opus)\b/i)?.[1]?.toLowerCase() ?? '?';
    const pass = !c.expectForge && c.size.includes(size) && c.floor === floor;
    return { ...c, answer: `${size} ${floor}`, size_got: size, floor_got: floor, pass };
  } catch (e) {
    return { ...c, answer: `<error: ${e.code || e.message?.slice(0, 60)}>`, size_got: '?', floor_got: '?', pass: false };
  }
}

const results = [];
let cursor = 0;
async function worker() {
  while (cursor < cases.length) {
    const c = cases[cursor++];
    const r = await judgeCase(c);
    results.push(r);
    const expected = r.expectForge ? 'forge' : `${(r.size || []).join('|')} ${r.floor}`;
    console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  [${r.tag}] "${r.task}" → ${r.answer}${r.pass ? '' : ` (expected ${expected})`}`);
  }
}
console.log(`Routing evals: ${cases.length} cases · model ${MODEL} · concurrency ${CONCURRENCY}\n`);
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, cases.length) }, worker));

const passed = results.filter((r) => r.pass).length;
const routineHot = results.filter((r) => r.tag === 'routine' && r.floor_got === 'opus');
const hardCold = results.filter((r) => r.tag === 'hard' && r.floor_got !== 'opus');
const need = Math.max(1, results.length - 1);
console.log(`\nPass rate: ${passed}/${results.length} · need ≥ ${need}/${results.length}`);
console.log(`Hard constraints: routine→opus ${routineHot.length} (need 0) · hard→not-opus ${hardCold.length} (need 0)`);
const ok = passed >= need && routineHot.length === 0 && hardCold.length === 0;
console.log(ok ? 'Routing evals: PASS' : 'Routing evals: FAIL');
process.exit(ok ? 0 : 1);
