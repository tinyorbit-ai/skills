import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Score one plan at a time against the real rubric — the exact prompt shape
// run.mjs's judge() builds — and check the floor separates golden from degraded
// with headroom on both sides.
export default async function check({ workdir, judgeRaw, root }) {
  const checks = [];
  const add = (name, pass, detail, required = true) => checks.push({ name, pass, detail, required });

  const FLOOR = 7;
  const standards = readFileSync(join(root, 'skills/forge-principles/references/simplicity.md'), 'utf8');
  const rubric = readFileSync(join(root, 'evals/behavioral/cases/forge-plan-structural/rubric.md'), 'utf8');

  const score = async (plan) => {
    const prompt = [
      'You are grading the output of an autonomous agent run. Be strict; a generous grade defeats the eval.',
      '', '## Standards to grade against (verbatim from the project — these outrank the rubric)',
      `\n===== skills/forge-principles/references/simplicity.md — the project's own standard, verbatim =====\n${standards}`,
      '', '## Rubric (dimensions and pass floor)', rubric,
      '', '## Artifacts to grade', `\n===== wiki/plan.md =====\n${plan}`, '',
      'Reply with ONLY a JSON object: {"scores": {"<dimension>": <0-10>, ...}, "pass": <true|false>, "worst": "<dimension>", "reasons": ["..."]}',
      "pass is true only if EVERY dimension meets the rubric's floor.",
    ].join('\n');
    try { return JSON.parse((await judgeRaw(prompt)).match(/\{[\s\S]*\}/)[0]); } catch { return { scores: {} }; }
  };

  const golden = await score(readFileSync(join(workdir, 'golden-plan.md'), 'utf8'));
  const degraded = await score(readFileSync(join(workdir, 'degraded-plan.md'), 'utf8'));
  const vals = (v) => Object.values(v.scores ?? {});
  const gMin = vals(golden).length ? Math.min(...vals(golden)) : -1;
  const dMax = vals(degraded).length ? Math.max(...vals(degraded)) : 99;
  const fmt = (v) => Object.entries(v.scores ?? {}).map(([k, s]) => `${k} ${s}`).join(', ');

  add('judge returned scores for both plans', vals(golden).length > 0 && vals(degraded).length > 0);
  add(`golden clears the floor on every dimension (≥ ${FLOOR})`, gMin >= FLOOR, `worst ${gMin} — ${fmt(golden)}`);
  add('degraded is rejected', degraded.pass === false || dMax < FLOOR, `best ${dMax} — ${fmt(degraded)}`);

  // Headroom is the point: a golden plan scraping the floor means every real case
  // is decided by run-to-run noise, which is what happened before this case existed.
  add('golden has headroom above the floor (worst dimension ≥ floor + 1)', gMin >= FLOOR + 1,
    `worst dimension ${gMin} vs floor ${FLOOR}`, false);
  add('separation is wide (golden worst exceeds degraded best by ≥ 3)', gMin - dMax >= 3,
    `golden worst ${gMin} vs degraded best ${dMax}`);

  return checks;
}
