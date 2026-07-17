#!/usr/bin/env node
// grade.mjs — Layer-2 outcome grading for a lizard eval run.
//
//   grade.mjs --run-id ID
//
// Reads cases.json + results/<run-id>/*.payload.json, compares each captured
// dry-run payload to its golden answer, and rolls up the asymmetric-loss metrics
// (false-🦎 first). Writes results/<run-id>/scorecard.{json,md} and appends one
// trend row to snapshots/SCOREBOARD.md. Format-contract pass/fail is delegated to
// lint.sh (invoked per payload) so the two graders never drift.
//
// Exit non-zero if any case produced a false-🦎 or errored — those are the
// outcomes a pre-push smoke run must never ship silently.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const EVAL_DIR = path.resolve(SCRIPT_DIR, '..');
const CASES_JSON = path.join(EVAL_DIR, 'cases.json');
const LINT = path.join(SCRIPT_DIR, 'lint.sh');
const SCOREBOARD = path.join(EVAL_DIR, 'snapshots', 'SCOREBOARD.md');

const META_RE =
  /<!-- lizard:v1 verdict=(go|wait|block) tier=(quick|standard|deep) adversary=(codex|claude|none) head=(\S+) diff=(\S+) context=(\S+) -->/;
const EVENT_VERDICT = { APPROVE: 'go', COMMENT: 'wait', REQUEST_CHANGES: 'block' };

function die(msg, code = 2) {
  process.stderr.write(`grade.mjs: ${msg}\n`);
  process.exit(code);
}

// --- args --------------------------------------------------------------------
let runId = null;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--run-id') runId = argv[++i];
  else if (argv[i].startsWith('--run-id=')) runId = argv[i].slice('--run-id='.length);
  else if (argv[i] === '-h' || argv[i] === '--help') die('usage: grade.mjs --run-id ID', 0);
}
if (!runId) die('usage: grade.mjs --run-id ID');

const resultsDir = path.join(EVAL_DIR, 'results', runId);
if (!fs.existsSync(resultsDir)) die(`no results at ${resultsDir} — run bin/run.sh --run-id ${runId} first`);
if (!fs.existsSync(CASES_JSON)) die(`no cases.json at ${CASES_JSON}`);

const cases = JSON.parse(fs.readFileSync(CASES_JSON, 'utf8'));

let model = process.env.LIZARD_EVAL_MODEL || 'default';
const metaPath = path.join(resultsDir, 'run-meta.json');
if (fs.existsSync(metaPath)) {
  try {
    model = JSON.parse(fs.readFileSync(metaPath, 'utf8')).model || model;
  } catch { /* fall back to env/default */ }
}

// --- helpers -----------------------------------------------------------------
function parseMeta(body) {
  const m = String(body).match(META_RE);
  if (!m) return null;
  return { verdict: m[1], tier: m[2], adversary: m[3], head: m[4], diff: m[5], context: m[6] };
}

function forbiddenViolated(rawTok, event, hay) {
  const tok = String(rawTok).toLowerCase().trim();
  if (['stamp', 'stamps', 'stamped', 'approve', 'approves', 'go', 'false-lizard'].includes(tok))
    return event === 'APPROVE';
  if (['block', 'blocks', 'request_changes', 'request-changes', 'do-not-merge'].includes(tok))
    return event === 'REQUEST_CHANGES';
  if (['wait', 'comment', 'not-yet'].includes(tok)) return event === 'COMMENT';
  // Unmapped behaviors are checked textually where possible (documented limitation).
  return hay.includes(tok);
}

function lintFormat(payloadPath) {
  try {
    execFileSync('bash', [LINT, 'review', payloadPath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, fails: [] };
  } catch (e) {
    const out = String((e.stdout || '') + (e.stderr || ''));
    return { ok: false, fails: out.split('\n').filter((l) => l.startsWith('FAIL')) };
  }
}

// --- grade each case ---------------------------------------------------------
const graded = [];
for (const c of cases) {
  const r = {
    id: c.id,
    error: null,
    expected_verdict: c.expected_verdict,
    expected_tier: c.expected_tier,
  };
  const payloadPath = path.join(resultsDir, `${c.id}.payload.json`);
  if (!fs.existsSync(payloadPath)) {
    r.error = 'no-payload';
    graded.push(r);
    continue;
  }
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
  } catch {
    r.error = 'invalid-json';
    graded.push(r);
    continue;
  }

  const event = payload.event || '';
  const body = payload.body || '';
  const comments = Array.isArray(payload.comments) ? payload.comments : [];
  const hay = (body + '\n' + comments.map((x) => x.body || '').join('\n')).toLowerCase();

  r.event = event;
  r.stamp_as_comment = payload.comment === true;
  const eventVerdict = EVENT_VERDICT[event] || null;
  r.verdict = eventVerdict;

  const meta = parseMeta(body);
  r.tier = meta ? meta.tier : null;

  // Format contract via lint.sh.
  const fmt = lintFormat(payloadPath);
  r.format_ok = fmt.ok;
  r.format_fails = fmt.fails;

  // Verdict must be consistent between the review event and the metadata line.
  const verdictConsistent = !!eventVerdict && !!meta && meta.verdict === eventVerdict;
  r.verdict_consistent = verdictConsistent;
  if (!verdictConsistent) r.format_ok = false;

  // Verdict vs expected, with the hedge allowance. A case may list
  // `also_acceptable_verdicts` / `also_acceptable_tiers` for outcomes that pass
  // without being the golden answer.
  const okVerdicts = [c.expected_verdict, ...(c.also_acceptable_verdicts ?? [])];
  const isHedge =
    !!c.allow_hedge && okVerdicts.includes('wait') && event === 'COMMENT' && /\?/.test(body);
  r.verdict_ok = okVerdicts.includes(eventVerdict) || isHedge;
  r.hedge_accepted = isHedge;

  // Tier.
  const okTiers = [c.expected_tier, ...(c.also_acceptable_tiers ?? [])];
  r.tier_ok = !!meta && okTiers.includes(meta.tier);

  // Expected blocking findings — matched when a comment (or the body, for pure
  // deletions with no surviving anchor) references the finding's path. A finding
  // may also carry `anchor_path` — where lizard can actually attach the inline
  // comment (e.g. the in-diff deletion line) when the logical `path` (a surviving
  // call site) is itself out of the diff. Either location counts as recalled.
  const blocking = (c.findings || []).filter((f) => f.blocking);
  const findingResults = blocking.map((f) => {
    const paths = [f.path, f.anchor_path].filter(Boolean);
    const inComment = comments.some((cm) => paths.includes(cm.path));
    const inBody = paths.some((p) => body.includes(p));
    return { path: f.path, anchor_path: f.anchor_path, class: f.class, matched: inComment || inBody };
  });
  r.findings_total = blocking.length;
  r.findings_matched = findingResults.filter((f) => f.matched).length;
  r.finding_results = findingResults;
  if (blocking.length === 0) {
    r.findings_ok = true;
  } else if (isHedge) {
    r.findings_ok = true; // a hedged question stands in for the blocking finding
  } else {
    r.findings_ok = r.findings_matched === blocking.length;
  }

  // Forbidden behaviors.
  const violations = (c.forbidden || []).filter((f) => forbiddenViolated(f, event, hay));
  r.forbidden_violations = violations;
  r.forbidden_ok = violations.length === 0;

  r.pass = r.verdict_ok && r.format_ok && r.findings_ok && r.forbidden_ok;
  graded.push(r);
}

// --- rollup ------------------------------------------------------------------
let passed = 0,
  errors = 0,
  falseLizard = 0,
  falseBlock = 0,
  findingsTotal = 0,
  findingsMatched = 0,
  formatPass = 0,
  formatTotal = 0,
  tierMatch = 0,
  tierTotal = 0;

for (const r of graded) {
  if (r.error) {
    errors++;
    continue;
  }
  if ((r.expected_verdict === 'wait' || r.expected_verdict === 'block') && r.verdict === 'go') falseLizard++;
  if (r.expected_verdict === 'go' && (r.verdict === 'wait' || r.verdict === 'block')) falseBlock++;
  findingsTotal += r.findings_total;
  findingsMatched += r.findings_matched;
  formatTotal++;
  if (r.format_ok) formatPass++;
  tierTotal++;
  if (r.tier_ok) tierMatch++;
  if (r.pass) passed++;
}

const findingRecall = findingsTotal ? findingsMatched / findingsTotal : null;
const formatPassRate = formatTotal ? formatPass / formatTotal : null;
const tierAccuracy = tierTotal ? tierMatch / tierTotal : null;

const totals = {
  cases: cases.length,
  passed,
  errors,
  false_lizard_count: falseLizard,
  false_block_count: falseBlock,
  finding_recall: findingRecall,
  format_pass_rate: formatPassRate,
  tier_accuracy: tierAccuracy,
};

// --- write scorecard.json ----------------------------------------------------
const gradedAt = new Date().toISOString();
const scorecard = { run_id: runId, model, graded_at: gradedAt, totals, cases: graded };
fs.writeFileSync(path.join(resultsDir, 'scorecard.json'), JSON.stringify(scorecard, null, 2) + '\n');

// --- write scorecard.md ------------------------------------------------------
const pct = (x) => (x == null ? 'n/a' : `${Math.round(x * 100)}%`);
const mark = (b) => (b ? 'ok' : 'FAIL');
const mdLines = [];
mdLines.push(`# Scorecard — ${runId}`);
mdLines.push('');
mdLines.push(`- model: \`${model}\``);
mdLines.push(`- graded: ${gradedAt}`);
mdLines.push(`- **false-🦎: ${falseLizard}**  ·  false-block: ${falseBlock}  ·  errors: ${errors}`);
mdLines.push(`- passed: ${passed}/${cases.length}  ·  finding recall: ${pct(findingRecall)}  ·  format: ${pct(formatPassRate)}  ·  tier: ${pct(tierAccuracy)}`);
mdLines.push('');
mdLines.push('| Case | Expect | Got | Verdict | Format | Findings | Tier | Pass |');
mdLines.push('|---|---|---|---|---|---|---|---|');
for (const r of graded) {
  if (r.error) {
    mdLines.push(`| ${r.id} | ${r.expected_verdict} | — | ERROR (${r.error}) | — | — | — | FAIL |`);
    continue;
  }
  const findings = r.findings_total ? `${r.findings_matched}/${r.findings_total}` : '—';
  const tierCell = `${r.tier || '?'}${r.tier_ok ? '' : `≠${r.expected_tier}`}`;
  mdLines.push(
    `| ${r.id} | ${r.expected_verdict} | ${r.verdict || '?'}${r.hedge_accepted ? ' (hedge)' : ''} | ${mark(r.verdict_ok)} | ${mark(r.format_ok)} | ${findings} | ${tierCell} | ${r.pass ? 'ok' : 'FAIL'} |`,
  );
}
mdLines.push('');
fs.writeFileSync(path.join(resultsDir, 'scorecard.md'), mdLines.join('\n'));

// --- append to SCOREBOARD.md -------------------------------------------------
const date = gradedAt.slice(0, 10);
const flisz = falseLizard > 0 ? `**${falseLizard}**` : '0';
const row = `| ${date} | ${runId} | ${model} | ${passed}/${cases.length} | ${flisz} | ${falseBlock} | ${pct(formatPassRate)} |`;
const HEADER = [
  '# Lizard eval scoreboard',
  '',
  'Append-only trend of graded smoke runs (newest at the bottom). `false-🦎` — a',
  'planted critical/major that got stamped — is the metric that matters most; it is',
  'bolded whenever non-zero. See `results/<run-id>/scorecard.md` for the per-case detail.',
  '',
  '| Date | Run ID | Model | Pass | False-🦎 | False-block | Format % |',
  '|---|---|---|---|---|---|---|',
  '',
].join('\n');
let sb = fs.existsSync(SCOREBOARD) ? fs.readFileSync(SCOREBOARD, 'utf8') : HEADER;
if (!sb.includes('| Date | Run ID |')) sb = HEADER;
sb = sb.replace(/\s*$/, '\n'); // normalize trailing whitespace to a single newline
sb += row + '\n';
fs.writeFileSync(SCOREBOARD, sb);

// --- console summary ---------------------------------------------------------
process.stdout.write(
  [
    `run ${runId} (model ${model})`,
    `  passed        ${passed}/${cases.length}`,
    `  false-🦎      ${falseLizard}`,
    `  false-block   ${falseBlock}`,
    `  errors        ${errors}`,
    `  finding recall ${pct(findingRecall)}`,
    `  format        ${pct(formatPassRate)}`,
    `  tier accuracy ${pct(tierAccuracy)}`,
    `  scorecard     ${path.join('results', runId, 'scorecard.md')}`,
    '',
  ].join('\n'),
);

process.exit(falseLizard > 0 || errors > 0 ? 1 : 0);
