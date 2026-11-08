// Run: node --test skills/forge/scripts/status.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { status } from './status.mjs';

const script = join(dirname(fileURLToPath(import.meta.url)), 'status.mjs');

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

// Projects (references/projects.md): wiki/projects/<slug>/ holds a project's record.
function withProjects(projects, rootFiles = {}) {
  const dir = project(rootFiles);
  for (const [slug, files] of Object.entries(projects)) {
    mkdirSync(join(dir, 'wiki', 'projects', slug), { recursive: true });
    for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, 'wiki', 'projects', slug, name), body);
  }
  return dir;
}

const locked = plan('## Review\n**Lock status:** locked\n').replaceAll('phase/', 'phase/a-');
const twoProjects = () => withProjects({
  a: { 'brief.md': '# Brief', 'plan.md': locked, 'build-log.md': '## Phase 1 — Thin slice\n' },
  b: { 'brief.md': '# Brief' },
});

test('--project reads that folder', () => {
  const dir = twoProjects();
  const a = status(dir, 'a');
  assert.equal(a.project, 'a');
  assert.equal(a.stage, 'build');
  assert.equal(a.phase, 2);
  assert.equal(a.phases[1].branch, 'phase/a-2-second');
  assert.equal(status(dir, 'b').stage, 'planning');
  assert.equal(status(dir, 'new-one').stage, 'discovery');
});

test('two projects and no root brief means choose', () => {
  const s = status(twoProjects());
  assert.equal(s.stage, 'choose');
  assert.deepEqual(s.projects, ['a', 'b']);
});

test('the only project folder is picked without an argument', () => {
  const s = status(withProjects({ b: { 'brief.md': '# Brief' } }));
  assert.equal(s.project, 'b');
  assert.equal(s.stage, 'planning');
});

test('a real root plan next to project folders is a choice, not a default', () => {
  const s = status(withProjects({ a: {}, b: {} }, { 'brief.md': '# Brief', 'plan.md': plan() }));
  assert.equal(s.stage, 'choose');
  assert.deepEqual(s.projects, ['root', 'a', 'b']);
  const one = status(withProjects({ checkout: {} }, { 'brief.md': '# Brief', 'plan.md': plan() }));
  assert.deepEqual(one.projects, ['root', 'checkout']);
});

test('a worker on its own branch is asked which project, never handed the root plan', () => {
  const dir = withProjects({ checkout: { 'brief.md': '# Brief' } }, { 'brief.md': '# Brief', 'plan.md': plan() });
  execFileSync('git', ['init', '-q', '-b', 'arnold/ACME-42', dir]);
  const out = JSON.parse(execFileSync('node', [script, '--dir', dir, '--json'], { encoding: 'utf8' }));
  assert.equal(out.stage, 'choose');
  assert.equal(out.branch, 'arnold/ACME-42');
  assert.deepEqual(out.projects, ['root', 'checkout']);
});

test('--project root names the root files; the root plan\'s own branch picks it too', () => {
  const dir = withProjects({ checkout: { 'brief.md': '# Brief' } }, { 'brief.md': '# Brief', 'plan.md': plan() });
  const s = status(dir, 'root');
  assert.equal('project' in s, false);
  assert.equal(s.next, 'forge-harden');
  execFileSync('git', ['init', '-q', '-b', 'phase/2-second', dir]);
  assert.equal(status(dir).next, 'forge-harden');
});

test('a root-only repo reads the same with --project root', () => {
  const dir = project({ 'brief.md': '# Brief', 'plan.md': plan() });
  assert.deepEqual(status(dir, 'root'), status(dir));
});

test('the checked-out phase branch picks its project', () => {
  const dir = twoProjects();
  execFileSync('git', ['init', '-q', '-b', 'phase/a-2-second', dir]);
  const s = status(dir);
  assert.equal(s.project, 'a');
  assert.equal(s.next, 'forge-build (continue) → forge-review → forge-ship');
});

test('a root-only repo reports no project key', () => {
  const s = status(project({ 'brief.md': '# Brief', 'plan.md': plan() }));
  assert.equal('project' in s, false);
  assert.equal('projects' in s, false);
});

test('a slug that is not a slug is refused', () => {
  assert.throws(() => status(twoProjects(), '../a'), /not a project slug/);
});
