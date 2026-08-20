#!/usr/bin/env node
// Tier 1 — trigger-routing evals. The `description` frontmatter is the trigger;
// this suite asserts that a model shown ONLY the current descriptions routes each
// utterance to the right skill. Descriptions are read live from skills/*/SKILL.md,
// so editing a description and re-running immediately shows routing regressions.
// Scope: the forge suite (forge + forge-*) plus maximum-effort; pass --all to include every skill.
//
// Run:  node evals/trigger/run.mjs [--dry-run] [--only <substring>]
// Env:  EVAL_TRIGGER_MODEL (default claude-haiku-4-5-20251001 — a weak router is a
//       stricter test of description quality), EVAL_TRIGGER_THRESHOLD (default 0.9),
//       EVAL_CONCURRENCY (default 4)

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
const ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const SKILLS_DIR = join(ROOT, 'skills');
const MODEL = process.env.EVAL_TRIGGER_MODEL || 'claude-haiku-4-5-20251001';
const THRESHOLD = Number(process.env.EVAL_TRIGGER_THRESHOLD || 0.9);
const CONCURRENCY = Number(process.env.EVAL_CONCURRENCY || 4);
const dryRun = process.argv.includes('--dry-run');
const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx !== -1 ? process.argv[onlyIdx + 1] : null;

const allScope = process.argv.includes('--all') || process.env.EVALS_SCOPE === 'all';
const inScope = (name) => allScope || name === 'forge' || name.startsWith('forge-') || name === 'maximum-effort';

// Collect live name+description from every public skill in scope
const skills = readdirSync(SKILLS_DIR)
  .filter((d) => !d.startsWith('.') && statSync(join(SKILLS_DIR, d)).isDirectory())
  .filter((d) => existsSync(join(SKILLS_DIR, d, 'SKILL.md')) && inScope(d))
  .map((d) => {
    const raw = readFileSync(join(SKILLS_DIR, d, 'SKILL.md'), 'utf8');
    const desc = raw.match(/^description:\s*(.*)$/m)?.[1]?.trim() ?? '';
    return { name: d, desc };
  });

const catalog = skills.map((s) => `- ${s.name}: ${s.desc}`).join('\n');
const validNames = new Set([...skills.map((s) => s.name), 'none']);

function buildPrompt(utterance) {
  return [
    'You are an agent deciding whether one of your available skills should be invoked for a user message.',
    'Available skills (name: trigger description):',
    catalog,
    '',
    `User message: "${utterance}"`,
    '',
    'Reply with ONLY the single most appropriate skill name from the list above, or exactly "none" if no skill should be invoked. No punctuation, no explanation.',
  ].join('\n');
}

let { cases } = JSON.parse(readFileSync(join(ROOT, 'evals/trigger/cases.json'), 'utf8'));
if (only) cases = cases.filter((c) => c.utterance.toLowerCase().includes(only.toLowerCase()));

if (dryRun) {
  console.log(buildPrompt(cases[0].utterance));
  console.log(`\n--dry-run: ${cases.length} cases, model ${MODEL}, threshold ${THRESHOLD}`);
  process.exit(0);
}

async function judgeCase(c) {
  try {
    const { stdout } = await execFileP('claude', ['-p', buildPrompt(c.utterance), '--model', MODEL], {
      timeout: 120_000,
      env: process.env,
    });
    const answer = stdout.trim().split('\n').pop().replace(/[`"'.]/g, '').trim().toLowerCase();
    const normalized = validNames.has(answer) ? answer : answer.split(/\s+/).find((w) => validNames.has(w)) ?? answer;
    const pass = c.expect.map((e) => e.toLowerCase()).includes(normalized);
    return { ...c, answer: normalized, pass };
  } catch (e) {
    return { ...c, answer: `<error: ${e.code || e.message?.slice(0, 60)}>`, pass: false };
  }
}

const results = [];
let cursor = 0;
async function worker() {
  while (cursor < cases.length) {
    const c = cases[cursor++];
    const r = await judgeCase(c);
    results.push(r);
    console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  "${r.utterance}" → ${r.answer}${r.pass ? '' : ` (expected ${r.expect.join(' | ')})`}`);
  }
}
console.log(`Trigger evals: ${cases.length} cases · model ${MODEL} · concurrency ${CONCURRENCY}\n`);
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, cases.length) }, worker));

const passed = results.filter((r) => r.pass).length;
const rate = passed / results.length;
console.log(`\nPass rate: ${passed}/${results.length} (${(rate * 100).toFixed(0)}%) · threshold ${(THRESHOLD * 100).toFixed(0)}%`);
process.exit(rate >= THRESHOLD ? 0 : 1);
