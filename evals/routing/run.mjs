#!/usr/bin/env node
// Tier 1b — routing evals for maximum-effort. The live `## When not to run` and
// `## Triage` sections decide whether Forge owns the task, its size, the primary leaf
// lane, and whether a frontier review earns its cost.

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

const skillPath = ['skills/maximum-effort/SKILL.md', 'skills/.experimental/maximum-effort/SKILL.md']
  .map((path) => join(ROOT, path))
  .find((path) => existsSync(path));
if (!skillPath) {
  console.error('maximum-effort SKILL.md not found');
  process.exit(1);
}
const skill = readFileSync(skillPath, 'utf8');
const standDown = skill.match(/^## When not to run\n([\s\S]*?)(?=^## )/m)?.[1]?.trim();
const triage = skill.match(/^## Triage\n([\s\S]*?)(?=^## )/m)?.[1]?.trim();
if (!standDown || !triage) {
  console.error(`missing "## When not to run" or "## Triage" in ${skillPath}`);
  process.exit(1);
}

function buildPrompt(task) {
  return [
    'Apply these routing rules to one task.',
    '',
    'When not to run:',
    standDown,
    '',
    'Triage:',
    triage,
    '',
    `Task: "${task}"`,
    '',
    'If Forge owns it, reply with exactly one word: forge.',
    'Otherwise reply with exactly three words: size (S, M or L), lane (owner, scout or mechanic), and review (self or frontier).',
    'Lane means the best primary leaf route after the frontier owner triages the task.',
    'Classify risk first. Auth, security controls, money, data, secrets, migrations, outbound side effects, ambiguity, root cause, original design, and decisions always use owner, never mechanic.',
    'For read-only work, size one bounded query as S and a repo-wide inventory as M.',
    'Use frontier review for risky M, original design, and every L task.',
  ].join('\n');
}

let { cases } = JSON.parse(readFileSync(join(ROOT, 'evals/routing/cases.json'), 'utf8'));
if (only) cases = cases.filter((item) => item.task.toLowerCase().includes(only.toLowerCase()));

if (dryRun) {
  console.log(buildPrompt(cases[0].task));
  console.log(`\n--dry-run: ${cases.length} cases, model ${MODEL}, skill ${skillPath.replace(`${ROOT}/`, '')}`);
  process.exit(0);
}

async function judgeCase(testCase) {
  try {
    const { stdout } = await execFileP('claude', [
      '-p', buildPrompt(testCase.task),
      '--model', MODEL,
      '--strict-mcp-config',
      '--mcp-config', '{"mcpServers":{}}',
    ], {
      timeout: 120_000,
      env: process.env,
    });
    const answer = stdout.trim().split('\n').pop().trim();
    if (/^forge$/i.test(answer)) {
      return { ...testCase, answer: 'forge', laneGot: 'forge', reviewGot: 'forge', pass: testCase.expectForge === true };
    }
    const parsed = answer.match(/^([SML])\s+(owner|scout|mechanic)\s+(self|frontier)$/i);
    const size = parsed?.[1]?.toUpperCase() ?? '?';
    const lane = parsed?.[2]?.toLowerCase() ?? '?';
    const review = parsed?.[3]?.toLowerCase() ?? '?';
    const expectedLanes = Array.isArray(testCase.lane) ? testCase.lane : [testCase.lane];
    const expectedReviews = Array.isArray(testCase.review) ? testCase.review : [testCase.review];
    const pass = !testCase.expectForge
      && testCase.size.includes(size)
      && expectedLanes.includes(lane)
      && expectedReviews.includes(review);
    return { ...testCase, answer: `${size} ${lane} ${review}`, rawAnswer: answer, sizeGot: size, laneGot: lane, reviewGot: review, pass };
  } catch (error) {
    return { ...testCase, answer: `<error: ${error.code || error.message?.slice(0, 60)}>`, laneGot: '?', reviewGot: '?', pass: false };
  }
}

const results = [];
let cursor = 0;
async function worker() {
  while (cursor < cases.length) {
    const current = cases[cursor++];
    const result = await judgeCase(current);
    results.push(result);
    const expectedLane = Array.isArray(result.lane) ? result.lane.join('|') : result.lane;
    const expectedReview = Array.isArray(result.review) ? result.review.join('|') : result.review;
    const expected = result.expectForge ? 'forge' : `${result.size.join('|')} ${expectedLane} ${expectedReview}`;
    const raw = !result.pass && result.rawAnswer && result.rawAnswer !== result.answer ? ` · raw: ${result.rawAnswer}` : '';
    console.log(`  ${result.pass ? 'PASS' : 'FAIL'}  [${result.tag}] "${result.task}" → ${result.answer}${result.pass ? '' : ` (expected ${expected})${raw}`}`);
  }
}

console.log(`Routing evals: ${cases.length} cases · model ${MODEL} · concurrency ${CONCURRENCY}\n`);
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, cases.length) }, worker));

const passed = results.filter((result) => result.pass).length;
const routineReviewed = results.filter((result) => result.tag === 'routine' && result.reviewGot === 'frontier');
const hardUnreviewed = results.filter((result) => result.tag === 'hard' && result.reviewGot !== 'frontier');
const menialKeptByOwner = results.filter((result) => result.tag === 'menial' && result.laneGot === 'owner');
const hardDelegated = results.filter((result) => result.tag === 'hard' && result.laneGot !== 'owner');
const designDelegated = results.filter((result) => result.tag === 'design' && result.laneGot !== 'owner');
const forgeMisses = results.filter((result) => result.tag === 'forge' && !result.pass);
const need = Math.max(1, results.length - 1);
console.log(`\nPass rate: ${passed}/${results.length} · need ≥ ${need}/${results.length}`);
console.log(`Hard constraints: routine→frontier ${routineReviewed.length} · hard→self ${hardUnreviewed.length} · menial→owner ${menialKeptByOwner.length} · hard→delegate ${hardDelegated.length} · design→delegate ${designDelegated.length} · forge misses ${forgeMisses.length} (all need 0)`);
const ok = passed >= need
  && routineReviewed.length === 0
  && hardUnreviewed.length === 0
  && menialKeptByOwner.length === 0
  && hardDelegated.length === 0
  && designDelegated.length === 0
  && forgeMisses.length === 0;
console.log(ok ? 'Routing evals: PASS' : 'Routing evals: FAIL');
process.exit(ok ? 0 : 1);
