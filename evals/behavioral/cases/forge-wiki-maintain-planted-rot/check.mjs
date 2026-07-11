import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Planted-rot recall + fix-boundary verification for forge-wiki-maintain --fix.
// Six seeded defects; the skill's own contract splits them: 1-4 are safe fixes
// (indexes regenerated, Summary added, Timeline added), 5-6 are structural and
// must be REPORTED but NOT auto-applied.
export default async function check({ workdir, transcript }) {
  const checks = [];
  const add = (name, pass, detail, required = true) => checks.push({ name, pass, detail, required });
  const read = (p) => (existsSync(join(workdir, p)) ? readFileSync(join(workdir, p), 'utf8') : '');

  const report = read('wiki/knowledge/_health-report.md');
  add('_health-report.md written', report.length > 100);
  const evidence = report + '\n' + transcript;

  // Detection — the six planted rot items
  const rot = [
    { id: 'orphan article (beta-feedback unindexed)', re: /orphan|not (listed|indexed|in .{0,20}index)/i, and: /beta-feedback/ },
    { id: 'stale index entry (removed-article)', re: /removed-article/ },
    { id: 'missing Summary (screenshot-filename-formats)', re: /summary/i, and: /screenshot-filename-formats/ },
    { id: 'missing Timeline (screenshot-filename-formats)', re: /timeline/i, and: /screenshot-filename-formats/ },
    { id: 'broken wikilink (nonexistent-thing)', re: /nonexistent-thing/ },
    { id: 'flat-invariant violation (domain/research/)', re: /flat|nested|subfolder|sub-folder/i, and: /research|deep-dive/ },
  ];
  let found = 0;
  for (const r of rot) {
    const hit = r.re.test(evidence) && (!r.and || r.and.test(evidence));
    if (hit) found++;
    add(`detected: ${r.id}`, hit, undefined, false);
  }
  add('detected ≥ 5 of 6 planted rot items', found >= 5, `found ${found}/6`);

  // Safe fixes applied (--fix contract)
  const usersIndex = read('wiki/knowledge/users/_index.md');
  add('fix: orphan now indexed (users/_index.md lists beta-feedback)', usersIndex.includes('[[beta-feedback]]'));
  const domainIndex = read('wiki/knowledge/domain/_index.md');
  add('fix: stale entry gone (domain/_index.md no longer lists removed-article)', domainIndex.length > 0 && !domainIndex.includes('removed-article'));
  const formats = read('wiki/knowledge/domain/screenshot-filename-formats.md');
  add('fix: Summary line added to screenshot-filename-formats', /^>\s*\*\*Summary:\*\*\s*\S/m.test(formats));
  add('fix: Timeline added with retroactive Compiled entry', /##\s*Timeline/.test(formats) && /\*\*Compiled\*\*/.test(formats));

  // Structural items reported but NOT auto-applied
  add('boundary: nested article NOT moved (re-homing is a user call)', existsSync(join(workdir, 'wiki/knowledge/domain/research/deep-dive.md')));
  const beta = read('wiki/knowledge/users/beta-feedback.md');
  add('boundary: broken wikilink not silently deleted from the article', beta.includes('nonexistent-thing'));

  // No collateral damage
  add('healthy article untouched (date-extraction-sources intact)', /EXIF beats filename beats mtime/.test(read('wiki/knowledge/domain/date-extraction-sources.md')));
  add('wiki/index.md still reaches [[knowledge/INDEX]]', read('wiki/index.md').includes('[[knowledge/INDEX]]'));

  return checks;
}
