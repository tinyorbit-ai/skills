// Run: node --test skills/forge/scripts/status.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { status } from './status.mjs';

function project(files) {
  const dir = mkdtempSync(join(tmpdir(), 'forge-status-'));
  mkdirSync(join(dir, 'wiki'));
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, 'wiki', name), body);
  return dir;
}

const plan = (review = '') => `# Plan
## Phase 1 — Thin slice
**Branch:** \`phase/1-thin\`
**Verifiable gate:** \`npm test\` passes
**Design:** none

## Phase 2 — Second
**Branch:** \`phase/2-second\`
**Verifiable gate:** \`npm run e2e\`
**Design:** none
${review}`;

test('no wiki means setup', () => {
  assert.equal(status(mkdtempSync(join(tmpdir(), 'forge-status-'))).next, 'forge-init');
});

test('stub brief means discovery', () => {
  assert.equal(status(project({ 'brief.md': 'Status: **stub — fill with `forge-discovery`.**' })).stage, 'discovery');
});

test('unhardened plan goes to harden', () => {
  assert.equal(status(project({ 'brief.md': '# Brief', 'plan.md': plan() })).next, 'forge-harden');
});

test('locked plan builds the first unlanded phase', () => {
  const s = status(project({
    'brief.md': '# Brief',
    'plan.md': plan('## Review\n**Lock status:** locked\n'),
    'build-log.md': '## Phase 1 — Thin slice\n',
  }));
  assert.equal(s.stage, 'build');
  assert.equal(s.phase, 2);
  assert.deepEqual(s.landed, [1]);
});

test('all landed without a retro means wrap-up, with one means done', () => {
  const files = {
    'brief.md': '# Brief',
    'plan.md': plan('## Review\n**Lock status:** locked\n'),
    'build-log.md': '## Phase 2 — Second\n## Phase 1 — Thin slice\n',
  };
  assert.equal(status(project(files)).next, 'forge-retro');
  assert.equal(status(project({ ...files, 'retro.md': '## 2026-09-26 — Retro (phases 1–2)\n' })).stage, 'done');
});

test('unlocked explore marker blocks the build loop', () => {
  const p = plan('## Review\n**Lock status:** locked\n').replace('**Design:** none', '**Design:** explore');
  assert.equal(status(project({ 'brief.md': '# Brief', 'plan.md': p })).stage, 'design');
});
