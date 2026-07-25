import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Economy of means at review time — the subtractive half of the bar.
//
// The phase-2 diff is correct and green; what it leaves behind is the defect.
// It supersedes the buffered parser but keeps it alive behind a caller-less
// compat shim, keeps a test file for behavior no longer in the product path,
// and over-tests the new parser. Every finding here is fixed by DELETING, so a
// review that only ever adds cannot pass this case.
export default async function check({ workdir, transcript, exec }) {
  const checks = [];
  const add = (name, pass, detail, required = true) => checks.push({ name, pass, detail, required });
  const has = (rel) => existsSync(join(workdir, rel));
  const read = (rel) => (has(rel) ? readFileSync(join(workdir, rel), 'utf8') : '');

  const learnings = read('wiki/learnings.md');
  const evidence = `${transcript}\n${learnings}`;

  // --- Superseded code: the diff made these dead; review must remove them ---
  add('caller-less compat shim deleted (src/compat.js)', !has('src/compat.js'));
  add('superseded buffered parser deleted (src/parse.js)', !has('src/parse.js'));
  add('orphaned test for removed behavior deleted (test/parse.test.js)', !has('test/parse.test.js'));

  // No survivor may still reference the removed module.
  const srcFiles = has('src') ? readdirSync(join(workdir, 'src')) : [];
  const testFiles = has('test') ? readdirSync(join(workdir, 'test')) : [];
  const refsParse = [...srcFiles.map((f) => `src/${f}`), ...testFiles.map((f) => `test/${f}`)]
    .filter((f) => /\.(js|mjs|cjs)$/.test(f))
    .filter((f) => /require\(['"]\.{1,2}\/parse['"]\)|from ['"]\.{1,2}\/parse['"]/.test(read(f)));
  add('no surviving file imports the removed parser', refsParse.length === 0, refsParse.join(', ') || undefined);

  // --- Test economy: thinned, not padded ---
  const streamTest = read('test/stream-parse.test.js');
  const allTestSrc = testFiles.map((f) => read(`test/${f}`)).join('\n');
  const totalTests = (allTestSrc.match(/^test\(/gm) || []).length;
  // 14 planted (2 orphaned + 1 e2e + 11 on the new parser); a real thinning lands ~5.
  add('test count meaningfully reduced from the planted 14', totalTests > 0 && totalTests <= 8, `${totalTests} test() blocks remain`);
  add('generator-internals mirror test removed', !/GeneratorFunction/.test(allTestSrc));
  add('Object.keys shape-mirror test removed', !/Object\.keys\(recs\[0\]\)/.test(allTestSrc));
  add('hand-rolled stub for an untouched module removed', !/fakeReader|readFileSync\(path, enc\)/.test(allTestSrc));
  add('60-row fixture proving a 2-row property removed or shrunk',
    (streamTest.match(/^\s*'user\d+,/gm) || []).length < 10,
    `${(streamTest.match(/^\s*'user\d+,/gm) || []).length} inline fixture rows`);

  // --- The bar it must NOT trade away: behavior still covered and green ---
  const gate = exec('node src/csvstats.js fixtures/sample.csv');
  add('gate still green after the deletions (rows: 4, mean 82.5)',
    gate.ok && /rows:\s*4/.test(gate.out) && /82\.5/.test(gate.out), gate.out.trim().slice(0, 120));
  const tests = exec('npm test');
  add('suite still green after the deletions', tests.ok, tests.ok ? undefined : tests.out.slice(-200));
  add('streaming parser still covered by a test', /parseStream/.test(allTestSrc));
  add('end-to-end stats behavior still covered', /csvstats|stats\(/.test(allTestSrc));

  // --- The reasoning is legible, not incidental ---
  add('names the superseded/dead code as the finding',
    /supersed|dead code|no (remaining )?caller|unused|caller-?less|orphan/i.test(evidence), undefined, false);
  add('names test economy as a finding',
    /duplicate test|redundant test|implementation[\s-]*mirror|over[\s-]*test|mock|fixture/i.test(evidence), undefined, false);
  add('review record prepended to learnings.md', />\s*review\b.*phase\s*2/i.test(learnings));

  return checks;
}
