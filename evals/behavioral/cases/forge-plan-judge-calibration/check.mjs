import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Calibration: does the judge, armed with forge's own standards, reliably prefer
// the disciplined plan over the bloated one? Ground truth is known (we seeded the
// bloat), so discrimination is measured, not assumed. Both presentation orders
// run to catch position bias.
export default async function check({ workdir, judgeRaw, root }) {
  const checks = [];
  const add = (name, pass, detail, required = true) => checks.push({ name, pass, detail, required });

  const standards = readFileSync(join(root, 'skills/forge/references/simplicity.md'), 'utf8');
  const golden = readFileSync(join(workdir, 'golden-plan.md'), 'utf8');
  const degraded = readFileSync(join(workdir, 'degraded-plan.md'), 'utf8');
  const brief = 'A zero-dependency Node CLI that tidies a screenshots folder: YYYY-MM/ subfolders by capture date, honest per-file date-source receipt, dedupe to _dupes/ (never delete), idempotent, --dry-run first-class, 2,000 files < 10 s. Non-goals: no OCR, no GUI, no watching, no cloud.';

  const ask = (a, b) => {
    const prompt = [
      'Two build plans were written for the same brief. Judge which better honors the quality standards below. Be strict and concrete.',
      '', '## The brief', brief,
      '', '## Quality standards (verbatim — apply literally, especially "default-deny on new parts" and the anti-patterns list)', standards,
      '', '## Plan A', a, '', '## Plan B', b, '',
      'Reply with ONLY a JSON object: {"winner": "A" | "B", "margin": <0-10, how much better the winner is>, "reasons": ["concrete, citing specifics from the losing plan"]}',
    ].join('\n');
    const out = judgeRaw(prompt);
    try { return JSON.parse(out.match(/\{[\s\S]*\}/)?.[0] ?? '{}'); } catch { return {}; }
  };

  const r1 = ask(golden, degraded); // golden is A
  const r2 = ask(degraded, golden); // golden is B
  add('order 1: judge picked the golden plan', r1.winner === 'A', `winner ${r1.winner}, margin ${r1.margin}`);
  add('order 2 (swapped): judge picked the golden plan — no position bias', r2.winner === 'B', `winner ${r2.winner}, margin ${r2.margin}`);
  const margins = [r1.margin, r2.margin].filter((m) => typeof m === 'number');
  add('discrimination is clear (average margin ≥ 2)', margins.length === 2 && (margins[0] + margins[1]) / 2 >= 2, `margins ${margins.join(', ')}`);

  const reasons = [...(r1.reasons ?? []), ...(r2.reasons ?? [])].join(' | ');
  const seeded = [/plugin|registry/i, /config(manager| file| system|uration)/i, /event.?bus|eventemitter/i, /abstract|base class/i, /foundation|no vertical|scaffold/i, /exifr|commander|dependenc/i, /typecheck.*lint.*test|generic gate|hygiene/i];
  const cited = seeded.filter((re) => re.test(reasons)).length;
  add('reasons cite ≥ 2 of the seeded bloat items', cited >= 2, `cited ${cited}/7 categories — ${reasons.slice(0, 160)}`);

  return checks;
}
