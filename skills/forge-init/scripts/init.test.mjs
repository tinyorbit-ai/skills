// Run: node --test skills/forge-init/scripts/init.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { init, injectRules, addProjectToIndex, addRulesToIndex, baseBranch } from './init.mjs';

function repo(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'forge-init-'));
  execFileSync('git', ['init', '-q', '-b', 'main', dir]);
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  return dir;
}
const read = (dir, rel) => readFileSync(join(dir, rel), 'utf8');
const snapshot = (dir) => execFileSync('sh', ['-c', `cd "${dir}" && find . -path ./.git -prune -o -type f -print | sort | xargs cat`], { encoding: 'utf8' });

test('an empty repo gets the scaffold and the rules in both agent files', () => {
  const dir = repo();
  const r = init(dir);
  assert.equal(r.status, 'done');
  assert.ok(existsSync(join(dir, 'wiki/knowledge/INDEX.md')));
  assert.match(read(dir, 'wiki/plan.md'), /\*\*Base branch:\*\* `main`/);
  assert.match(read(dir, 'AGENTS.md'), /^<!-- BEGIN:forge-wiki-rules -->/);
  assert.match(read(dir, 'CLAUDE.md'), /^@AGENTS\.md\n\n<!-- BEGIN:forge-wiki-rules -->/);
  assert.match(read(dir, 'AGENTS.md'), /wiki\/projects\/<slug>\//);
});

const blockOf = (text) => text.slice(text.indexOf('<!-- BEGIN:forge-wiki-rules -->'), text.indexOf('<!-- END:forge-wiki-rules -->'));

test('the block stays short and links wiki/RULES.md, which holds the full rules', () => {
  const dir = repo();
  init(dir);
  const block = blockOf(read(dir, 'AGENTS.md'));
  assert.ok(block.split('\n').length <= 15, `block is ${block.split('\n').length} lines`);
  assert.match(block, /`wiki\/RULES\.md`/);
  assert.match(block, /wiki\/decisions\//);
  assert.match(block, /wiki\/notes\//);
  const rules = read(dir, 'wiki/RULES.md');
  assert.match(rules, /^# Agent rules — forge-init-/);
  assert.match(rules, /### Ambient capture/);
  assert.match(rules, /## Phase & branch discipline/);
  assert.match(read(dir, 'wiki/index.md'), /\[\[RULES\]\]/);
});

test('a re-run swaps an old long block for the short one and keeps an existing RULES.md', () => {
  const long = Array.from({ length: 70 }, (_, k) => `old rule ${k}`).join('\n');
  const dir = repo({ 'AGENTS.md': `# Mine\n\n<!-- BEGIN:forge-wiki-rules -->\n${long}\n<!-- END:forge-wiki-rules -->\n\n## After\n` });
  mkdirSync(join(dir, 'wiki'));
  writeFileSync(join(dir, 'wiki/RULES.md'), '# My rules\n');
  const r = init(dir);
  assert.equal(r.agents['AGENTS.md'], 'updated');
  const agents = read(dir, 'AGENTS.md');
  assert.doesNotMatch(agents, /old rule/);
  assert.match(agents, /^# Mine\n\n<!-- BEGIN:forge-wiki-rules -->\n## Wiki and branches/);
  assert.match(agents, /END:forge-wiki-rules -->\n\n## After\n$/);
  assert.ok(blockOf(agents).split('\n').length <= 15);
  assert.equal(read(dir, 'wiki/RULES.md'), '# My rules\n');
});

test('a repo set up by the old init gets RULES.md and one [[RULES]] line in its index', () => {
  // What the old init left: the scaffold with no RULES.md, an index with no RULES line,
  // and the long block in AGENTS.md.
  const dir = repo();
  init(dir);
  rmSync(join(dir, 'wiki/RULES.md'));
  const oldIndex = read(dir, 'wiki/index.md').split('\n').filter((l) => !l.includes('[[RULES]]')).join('\n') + '\n- [[notes/2026-01-01-own]] — mine\n';
  writeFileSync(join(dir, 'wiki/index.md'), oldIndex);
  const long = Array.from({ length: 70 }, (_, k) => `old rule ${k}`).join('\n');
  writeFileSync(join(dir, 'AGENTS.md'), `<!-- BEGIN:forge-wiki-rules -->\n${long}\n<!-- END:forge-wiki-rules -->\n`);

  const r = init(dir);
  assert.ok(r.created.includes('wiki/RULES.md'));
  assert.ok(r.created.includes('wiki/index.md ([[RULES]])'));
  const index = read(dir, 'wiki/index.md');
  assert.equal((index.match(/\[\[RULES\]\]/g) ?? []).length, 1);
  assert.match(index, /\[\[improvements\]\][^\n]*\n- \[\[RULES\]\]/);
  assert.equal(index.replace(/^- \[\[RULES\]\].*\n/m, ''), oldIndex);
  assert.doesNotMatch(read(dir, 'AGENTS.md'), /old rule/);

  const before = snapshot(dir);
  init(dir);
  assert.equal(snapshot(dir), before);
});

test('the RULES line is added once, and placed even in an index of another shape', () => {
  const line = '- [[RULES]] — rules';
  for (const linked of ['- [[RULES]] — x\n', 'see [[RULES|the rules]]\n', 'see [rules](RULES.md)\n', 'see `wiki/RULES.md`\n']) {
    assert.equal(addRulesToIndex(`# I\n${linked}`, line), `# I\n${linked}`);
  }
  assert.equal(addRulesToIndex('# I\n\n## Map of content\n\n- [[brief]]\n- [[plan]]\n\n### Decisions\n', line), '# I\n\n## Map of content\n\n- [[brief]]\n- [[plan]]\n- [[RULES]] — rules\n\n### Decisions\n');
  assert.equal(addRulesToIndex('# I\nhello\n', line), '# I\nhello\n\n- [[RULES]] — rules\n');
});

test('a second run changes nothing', () => {
  const dir = repo();
  init(dir);
  const before = snapshot(dir);
  const r = init(dir);
  assert.equal(snapshot(dir), before);
  assert.match(r.notes, /nothing to change/);
});

test('existing agent files keep their text; an old block is replaced in place', () => {
  const dir = repo({ 'AGENTS.md': '# Mine\n', 'CLAUDE.md': 'top\n<!-- BEGIN:forge-wiki-rules -->\nold\n<!-- END:forge-wiki-rules -->\nbottom\n' });
  const r = init(dir);
  assert.equal(r.agents['AGENTS.md'], 'updated');
  assert.match(read(dir, 'AGENTS.md'), /^# Mine\n\n<!-- BEGIN:forge-wiki-rules -->/);
  const claude = read(dir, 'CLAUDE.md');
  assert.match(claude, /^top\n<!-- BEGIN/);
  assert.match(claude, /END:forge-wiki-rules -->\nbottom\n$/);
  assert.doesNotMatch(claude, /\nold\n/);
});

test('one marker without the other leaves the file alone and blocks', () => {
  const dir = repo({ 'AGENTS.md': 'x\n<!-- BEGIN:forge-wiki-rules -->\n' });
  const r = init(dir);
  assert.equal(r.status, 'blocked');
  assert.equal(read(dir, 'AGENTS.md'), 'x\n<!-- BEGIN:forge-wiki-rules -->\n');
  assert.equal(injectRules('a <!-- END:forge-wiki-rules --> <!-- BEGIN:forge-wiki-rules -->', 'B'), null);
});

test('not a git repo blocks', () => {
  assert.equal(init(mkdtempSync(join(tmpdir(), 'forge-init-'))).status, 'blocked');
});

test('--new adds a project folder and an index line, and leaves the root plan alone', () => {
  const dir = repo();
  init(dir);
  writeFileSync(join(dir, 'wiki/plan.md'), '# Plan\nreal\n');
  init(dir, { slug: 'checkout' });
  assert.equal(read(dir, 'wiki/plan.md'), '# Plan\nreal\n');
  const plan = read(dir, 'wiki/projects/checkout/plan.md');
  assert.match(plan, /phase\/checkout-<n>-<name>/);
  assert.match(plan, /\[\[projects\/checkout\/build-log\]\]/);
  assert.ok(existsSync(join(dir, 'wiki/projects/checkout/design/.gitkeep')));
  const index = read(dir, 'wiki/index.md');
  assert.match(index, /## Projects\n[\s\S]*\[\[projects\/checkout\/brief\]\][\s\S]*## Knowledge base/);
  const before = snapshot(dir);
  init(dir, { slug: 'checkout' });
  assert.equal(snapshot(dir), before);
});

test('a second project joins the same Projects list', () => {
  const index = addProjectToIndex(addProjectToIndex('# I\n\n## Knowledge base\n', 'a'), 'b');
  assert.equal((index.match(/^## Projects$/gm) ?? []).length, 1);
  assert.match(index, /\*\*a\*\*[^\n]*\n- \*\*b\*\*/);
});

const commit = (dir) => execFileSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'x']);

test('the base branch is the default branch, not the work branch init runs on', () => {
  const dir = repo();
  commit(dir);
  execFileSync('git', ['-C', dir, 'switch', '-q', '-c', 'arnold/ACME-42']);
  init(dir);
  assert.match(read(dir, 'wiki/plan.md'), /\*\*Base branch:\*\* `main`/);

  const old = mkdtempSync(join(tmpdir(), 'forge-init-'));
  execFileSync('git', ['init', '-q', '-b', 'master', old]);
  commit(old);
  execFileSync('git', ['-C', old, 'switch', '-q', '-c', 'feature/x']);
  assert.equal(baseBranch(old), 'master');

  execFileSync('git', ['-C', old, 'update-ref', 'refs/remotes/origin/develop', 'HEAD']);
  execFileSync('git', ['-C', old, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/develop']);
  assert.equal(baseBranch(old), 'develop');

  const bare = mkdtempSync(join(tmpdir(), 'forge-init-'));
  execFileSync('git', ['init', '-q', '-b', 'trunk', bare]);
  assert.equal(baseBranch(bare), 'trunk');
});

test('--new copies the root plan\'s Base branch line', () => {
  const dir = repo();
  init(dir);
  writeFileSync(join(dir, 'wiki/plan.md'), '# Plan\n\n**Base branch:** `develop` (releases cut from here)\n');
  init(dir, { slug: 'checkout' });
  const plan = read(dir, 'wiki/projects/checkout/plan.md');
  assert.match(plan, /^\*\*Base branch:\*\* `develop` \(releases cut from here\)$/m);
  assert.equal((plan.match(/Base branch/g) ?? []).length, 1);
});

test('a CLAUDE.md that imports @AGENTS.md does not get a second copy of the block', () => {
  const dir = repo({ 'AGENTS.md': '# Rules\n', 'CLAUDE.md': '@AGENTS.md\n' });
  const r = init(dir);
  assert.match(read(dir, 'AGENTS.md'), /BEGIN:forge-wiki-rules/);
  assert.equal(read(dir, 'CLAUDE.md'), '@AGENTS.md\n');
  assert.equal(r.agents['CLAUDE.md'], 'unchanged (imports @AGENTS.md)');
  assert.equal(init(dir).notes.includes('nothing to change'), true);

  // Without the block in AGENTS.md, the import alone isn't enough.
  const broken = repo({ 'AGENTS.md': 'x\n<!-- BEGIN:forge-wiki-rules -->\n', 'CLAUDE.md': '@AGENTS.md\n' });
  init(broken);
  assert.match(read(broken, 'CLAUDE.md'), /^@AGENTS\.md\n\n<!-- BEGIN:forge-wiki-rules -->/);
});

test('--new root is refused: root names the root files', () => {
  const dir = repo();
  const script = join(import.meta.dirname, 'init.mjs');
  let err;
  try {
    execFileSync('node', [script, '--dir', dir, '--new', 'root'], { encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    err = e;
  }
  assert.equal(err?.status, 2);
  assert.equal(existsSync(join(dir, 'wiki')), false);
});
