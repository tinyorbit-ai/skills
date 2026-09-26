// Run: node --test skills/forge-wiki/scripts/wiki-maintain.test.mjs
// Uses the planted-rot behavioral fixture: six seeded defects, 1-4 safe to fix, 5-6 report-only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { maintain } from './wiki-maintain.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const FIXTURE = join(ROOT, 'evals/behavioral/cases/forge-wiki-maintain-planted-rot/fixture/wiki');

function copy() {
  const dir = mkdtempSync(join(tmpdir(), 'wiki-maintain-'));
  cpSync(FIXTURE, join(dir, 'wiki'), { recursive: true });
  return join(dir, 'wiki');
}

test('report-only run finds the planted rot and changes nothing', () => {
  const wiki = copy();
  const before = readFileSync(join(wiki, 'knowledge/users/_index.md'), 'utf8');
  const { issues } = maintain({ wikiDir: wiki, today: '2026-09-26' });
  assert.ok(issues.orphans.some((x) => x.includes('beta-feedback')));
  assert.ok(issues.brokenIndex.some((x) => x.includes('removed-article')));
  assert.ok(issues.missingSummary.some((x) => x.includes('screenshot-filename-formats')));
  assert.ok(issues.missingTimeline.some((x) => x.includes('screenshot-filename-formats')));
  assert.ok(issues.brokenLinks.some((x) => x.includes('nonexistent-thing')));
  assert.ok(issues.flatViolations.some((x) => x.includes('research/deep-dive')));
  assert.equal(readFileSync(join(wiki, 'knowledge/users/_index.md'), 'utf8'), before);
});

test('--fix repairs the safe items and leaves structural ones alone', () => {
  const wiki = copy();
  maintain({ wikiDir: wiki, fix: true, today: '2026-09-26' });
  assert.match(readFileSync(join(wiki, 'knowledge/users/_index.md'), 'utf8'), /\[\[beta-feedback\]\]/);
  assert.doesNotMatch(readFileSync(join(wiki, 'knowledge/domain/_index.md'), 'utf8'), /removed-article/);
  const formats = readFileSync(join(wiki, 'knowledge/domain/screenshot-filename-formats.md'), 'utf8');
  assert.match(formats, /## Timeline/);
  assert.match(formats, /\*\*Compiled\*\*/);
  assert.ok(existsSync(join(wiki, 'knowledge/domain/research/deep-dive.md')));
  assert.match(readFileSync(join(wiki, 'knowledge/users/beta-feedback.md'), 'utf8'), /nonexistent-thing/);
  assert.match(readFileSync(join(wiki, 'index.md'), 'utf8'), /\[\[knowledge\/INDEX\]\]/);
  assert.ok(existsSync(join(wiki, 'knowledge/_health-report.md')));
});

test('same input and date give the same indexes', () => {
  const a = copy();
  const b = copy();
  maintain({ wikiDir: a, fix: true, today: '2026-09-26' });
  maintain({ wikiDir: b, fix: true, today: '2026-09-26' });
  assert.equal(readFileSync(join(a, 'knowledge/INDEX.md'), 'utf8'), readFileSync(join(b, 'knowledge/INDEX.md'), 'utf8'));
});
