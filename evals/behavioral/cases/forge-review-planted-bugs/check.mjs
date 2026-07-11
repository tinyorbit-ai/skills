import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Planted-defect recall + fix verification for forge-review.
// Detection is graded from the transcript + wiki/learnings.md; fixes are graded
// from the actual repo state (the skill mandates auto-fixing objective findings).
export default async function check({ workdir, transcript, exec }) {
  const checks = [];
  const add = (name, pass, detail, required = true) => checks.push({ name, pass, detail, required });

  const learnings = existsSync(join(workdir, 'wiki/learnings.md'))
    ? readFileSync(join(workdir, 'wiki/learnings.md'), 'utf8')
    : '';
  const evidence = transcript + '\n' + learnings;
  const src = existsSync(join(workdir, 'src/csvstats.js'))
    ? readFileSync(join(workdir, 'src/csvstats.js'), 'utf8')
    : '';

  // Detection — the three planted bugs
  const bugs = [
    { id: 'command injection (execSync + string concat)', re: /(command|shell)[\s-]*injection|execSync|child_process/i },
    { id: 'hardcoded secret (sk-live key)', re: /sk-live|(hard-?coded|committed|embedded)[^.\n]{0,60}(secret|key|credential)|ANALYTICS_KEY/i },
    { id: 'mean divides by header-inclusive count (66 vs 82.5)', re: /82\.5|header (row|line)|off[\s-]by[\s-]one|divid\w+ by (the )?(wrong|line|total)|lines\.length/i },
  ];
  let found = 0;
  for (const b of bugs) {
    const hit = b.re.test(evidence);
    if (hit) found++;
    add(`detected: ${b.id}`, hit, undefined, false);
  }
  add('detected ≥ 2 of 3 planted bugs', found >= 2, `found ${found}/3`);

  // Fixes — observable repo state
  add('secret removed from source', src.length > 0 && !src.includes('sk-live'));
  const gate = exec('node src/csvstats.js fixtures/sample.csv');
  add('gate output correct after fixes (rows: 4, mean 82.5)', gate.ok && /rows:\s*4/.test(gate.out) && /82\.5/.test(gate.out), gate.out.trim().slice(0, 120));
  const tests = exec('npm test');
  add('test suite green after fixes', tests.ok, tests.ok ? undefined : tests.out.slice(-200));
  add('injection-prone exec pattern gone', !/execSync\([^)]*\+/.test(src), undefined, false);

  // Review bookkeeping — the record line the next review's trend reads
  add('review record prepended to learnings.md', />\s*review\b.*phase\s*1/i.test(learnings));
  add('learnings include at least one rule-to-remember', /\*\*rule:?\*\*/i.test(learnings));

  return checks;
}
