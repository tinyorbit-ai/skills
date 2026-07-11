#!/usr/bin/env node
// Tier 2 — behavioral evals. Runs a skill end-to-end in a throwaway fixture repo via
// headless `claude -p`, then grades the resulting artifacts with the case's
// deterministic check.mjs and (optionally) an LLM judge against the case's rubric.md.
//
// Run:  node evals/behavioral/run.mjs <case> [<case> ...] [--runs N] [--model M] [--keep]
//       node evals/behavioral/run.mjs --all
//
// Case layout (evals/behavioral/cases/<name>/):
//   task.md      the headless prompt handed to `claude -p`
//   config.json  { "skills": [..], "branch": "phase/..", "judgeFiles": [..], "timeoutMinutes": N }
//   fixture/     copied into the workdir. Either flat (committed on main), or split into
//                base/ (committed on main) + phase/ (overlaid + committed on config.branch)
//   check.mjs    default export: async ({ workdir, transcript, exec }) => [{ name, pass, required, detail }]
//   rubric.md    optional — an LLM judge grades config.judgeFiles against it, JSON verdict
//
// Runs are stochastic: use --runs 3 for anything you intend to trust.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, cpSync, symlinkSync, statSync } from 'node:fs';
import { execFileSync, execSync } from 'node:child_process';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync } from 'node:fs';

const ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const CASES_DIR = join(ROOT, 'evals/behavioral/cases');
const RESULTS_DIR = join(ROOT, 'evals/results');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i !== -1 ? argv[i + 1] : dflt;
};
const runs = Number(opt('--runs', 1));
const modelOverride = opt('--model', null);
const keep = flag('--keep');
const caseNames = flag('--all')
  ? readdirSync(CASES_DIR).filter((d) => statSync(join(CASES_DIR, d)).isDirectory())
  : argv.filter((a) => !a.startsWith('--') && a !== opt('--runs', null) && a !== modelOverride);

if (caseNames.length === 0) {
  console.error('Usage: node evals/behavioral/run.mjs <case>|--all [--runs N] [--model M] [--keep]');
  console.error(`Cases: ${readdirSync(CASES_DIR).join(', ')}`);
  process.exit(1);
}

const git = (workdir, args) =>
  execFileSync('git', ['-c', 'user.name=forge-eval', '-c', 'user.email=eval@local', ...args], { cwd: workdir, stdio: 'pipe' });

function setUpWorkdir(caseDir, config) {
  const workdir = mkdtempSync(join(tmpdir(), 'forge-eval-'));
  const fixture = join(caseDir, 'fixture');
  const split = existsSync(join(fixture, 'base'));

  if (existsSync(fixture)) cpSync(split ? join(fixture, 'base') : fixture, workdir, { recursive: true });
  git(workdir, ['init', '-b', 'main']);
  git(workdir, ['add', '-A']);
  git(workdir, ['commit', '-m', 'eval: base fixture', '--allow-empty']);

  if (split && existsSync(join(fixture, 'phase'))) {
    git(workdir, ['checkout', '-b', config.branch || 'phase/1-eval']);
    cpSync(join(fixture, 'phase'), workdir, { recursive: true });
    git(workdir, ['add', '-A']);
    git(workdir, ['commit', '-m', 'feat: phase work (eval fixture)']);
  }

  // Install the skills under test (untracked on purpose — keeps the phase diff clean)
  const skillsTarget = join(workdir, '.claude', 'skills');
  mkdirSync(skillsTarget, { recursive: true });
  for (const s of config.skills || []) {
    const src = join(ROOT, 'skills', s);
    if (!existsSync(src)) throw new Error(`skill not found in repo: ${s}`);
    symlinkSync(src, join(skillsTarget, s));
  }
  return workdir;
}

function runAgent(workdir, task, config, transcriptPath) {
  const timeoutMs = (config.timeoutMinutes || 20) * 60_000;
  const model = modelOverride || config.model;
  const args = ['-p', task, '--dangerously-skip-permissions', '--output-format', 'stream-json', '--verbose'];
  if (model) args.push('--model', model);
  let out = '';
  let agentError = null;
  try {
    out = execFileSync('claude', args, { cwd: workdir, timeout: timeoutMs, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '');
    agentError = e.killed ? `timed out after ${config.timeoutMinutes || 20}m` : `exit ${e.status}`;
  }
  writeFileSync(transcriptPath, out);
  return { transcript: out, agentError };
}

// One headless model call; returns raw text. Also handed to check.mjs so a case
// can run its own judge calls (e.g. the judge-calibration case).
function judgeRaw(prompt) {
  try {
    return execFileSync('claude', ['-p', prompt], { timeout: 300_000, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  } catch (e) {
    return `judge error: ${e.message?.slice(0, 120)}`;
  }
}

function judge(caseDir, config, workdir) {
  const rubricPath = join(caseDir, 'rubric.md');
  if (!existsSync(rubricPath)) return null;
  const rubric = readFileSync(rubricPath, 'utf8');
  // The project's own quality standards, verbatim — the judge grades against
  // these, not against a paraphrase (config.rubricSources, repo-relative).
  const standards = (config.rubricSources || [])
    .filter((f) => existsSync(join(ROOT, f)))
    .map((f) => `\n===== ${f} — the project's own standard, verbatim =====\n${readFileSync(join(ROOT, f), 'utf8')}`)
    .join('\n');
  const artifacts = (config.judgeFiles || [])
    .filter((f) => existsSync(join(workdir, f)))
    .map((f) => `\n===== ${f} =====\n${readFileSync(join(workdir, f), 'utf8')}`)
    .join('\n');
  const prompt = [
    'You are grading the output of an autonomous agent run. Be strict; a generous grade defeats the eval.',
    ...(standards ? ['', '## Standards to grade against (verbatim from the project — these outrank the rubric)', standards] : []),
    '', '## Rubric (dimensions and pass floor)', rubric,
    '', '## Artifacts to grade', artifacts || '(expected artifacts are missing — grade accordingly)', '',
    'Reply with ONLY a JSON object: {"scores": {"<dimension>": <0-10>, ...}, "pass": <true|false>, "worst": "<dimension>", "reasons": ["..."]}',
    'pass is true only if EVERY dimension meets the rubric\'s floor.',
  ].join('\n');
  try {
    const out = judgeRaw(prompt);
    const json = out.match(/\{[\s\S]*\}/)?.[0];
    return json ? JSON.parse(json) : { scores: {}, pass: false, reasons: ['judge returned no JSON'] };
  } catch (e) {
    return { scores: {}, pass: false, reasons: [`judge error: ${e.message?.slice(0, 100)}`] };
  }
}

mkdirSync(RESULTS_DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
let suiteFailed = false;

for (const name of caseNames) {
  const caseDir = join(CASES_DIR, name);
  const config = JSON.parse(readFileSync(join(caseDir, 'config.json'), 'utf8'));
  const skipAgent = config.agent === false; // judge-only cases (e.g. calibration) run no agent
  const task = skipAgent ? '' : readFileSync(join(caseDir, 'task.md'), 'utf8');
  const caseResults = [];

  for (let i = 1; i <= runs; i++) {
    console.log(`\n=== ${name} · run ${i}/${runs} ===`);
    const workdir = setUpWorkdir(caseDir, config);
    const runDir = join(RESULTS_DIR, `${stamp}-${name}`, `run-${i}`);
    mkdirSync(runDir, { recursive: true });
    console.log(`  workdir: ${workdir}`);

    const { transcript, agentError } = skipAgent
      ? { transcript: '', agentError: null }
      : runAgent(workdir, task, config, join(runDir, 'transcript.jsonl'));
    if (agentError) console.log(`  agent: ${agentError}`);

    const checkModule = await import(join(caseDir, 'check.mjs'));
    const exec = (cmd) => {
      try { return { ok: true, out: execSync(cmd, { cwd: workdir, encoding: 'utf8', timeout: 120_000, stdio: 'pipe' }) }; }
      catch (e) { return { ok: false, out: (e.stdout || '') + (e.stderr || '') }; }
    };
    let checks = [];
    try {
      checks = await checkModule.default({ workdir, transcript, exec, judgeRaw, root: ROOT });
    } catch (e) {
      checks = [{ name: 'check.mjs ran', pass: false, required: true, detail: e.message }];
    }
    for (const c of checks) {
      console.log(`  ${c.pass ? 'PASS' : c.required === false ? 'info' : 'FAIL'}  ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
    }

    const verdict = judge(caseDir, config, workdir);
    if (verdict) {
      const scores = verdict.scores && Object.keys(verdict.scores).length
        ? Object.entries(verdict.scores).map(([k, v]) => `${k} ${v}`).join(' · ')
        : `score ${verdict.score ?? '?'}/10`;
      console.log(`  judge: ${scores} · ${verdict.pass ? 'PASS' : 'FAIL'} · ${verdict.reasons?.join(' · ')}`);
    }

    const pass = !agentError && checks.every((c) => c.pass || c.required === false) && (verdict ? verdict.pass : true);
    caseResults.push({ run: i, pass, agentError, checks, judge: verdict, workdir: keep ? workdir : undefined });
    console.log(`  run verdict: ${pass ? 'PASS' : 'FAIL'}`);
    if (!keep) execSync(`rm -rf ${JSON.stringify(workdir)}`);
  }

  const passRate = caseResults.filter((r) => r.pass).length / caseResults.length;
  writeFileSync(join(RESULTS_DIR, `${stamp}-${name}`, 'result.json'), JSON.stringify({ case: name, stamp, runs, passRate, results: caseResults }, null, 2));
  console.log(`\n${name}: pass rate ${(passRate * 100).toFixed(0)}% over ${runs} run(s) → evals/results/${stamp}-${name}/`);
  if (passRate < 1) suiteFailed = true;
}

process.exit(suiteFailed ? 1 : 0);
