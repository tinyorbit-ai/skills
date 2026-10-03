#!/usr/bin/env node
// Tier 0 — static validation of SKILL.md files and mods/.
// Scope: the forge suite; pass --all to validate every skill. Mods are always checked.
// Deterministic, no tokens. Run: node evals/static/validate.mjs
// Exit 1 on any failure. Set EVALS_REQUIRE_CLI=1 to make the `npx skills` discovery check mandatory.

import { readFileSync, readdirSync, existsSync, statSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const SKILLS_DIR = join(ROOT, 'skills');

const failures = [];
const warnings = [];
const fail = (skill, msg) => failures.push(`${skill}: ${msg}`);
const warn = (skill, msg) => warnings.push(`${skill}: ${msg}`);

function skillDirs(base, internal = false) {
  if (!existsSync(base)) return [];
  return readdirSync(base)
    .filter((d) => !d.startsWith('.') && statSync(join(base, d)).isDirectory())
    .filter((d) => existsSync(join(base, d, 'SKILL.md')))
    .map((d) => ({ dir: join(base, d), name: basename(d), internal }));
}

const allScope = process.argv.includes('--all') || process.env.EVALS_SCOPE === 'all';
const inScope = (name) => allScope || name === 'forge' || name.startsWith('forge-');

const skills = [
  ...skillDirs(SKILLS_DIR),
  ...skillDirs(join(SKILLS_DIR, '.experimental'), true),
  ...skillDirs(join(SKILLS_DIR, '.system'), true),
].filter((s) => inScope(s.name));

if (skills.length === 0) {
  console.error('No skills found — is this running from the repo root?');
  process.exit(1);
}

function parseFrontmatter(raw) {
  if (!raw.startsWith('---\n')) return null;
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) return null;
  const fm = raw.slice(4, end);
  const body = raw.slice(end + 5);
  const get = (key) => {
    const m = fm.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
    return m ? m[1].trim() : null;
  };
  return { fm, body, get };
}

for (const s of skills) {
  const raw = readFileSync(join(s.dir, 'SKILL.md'), 'utf8');
  const parsed = parseFrontmatter(raw);
  if (!parsed) {
    fail(s.name, 'SKILL.md has no parseable frontmatter block');
    continue;
  }
  const { body, get } = parsed;

  // name === folder name
  const name = get('name');
  if (!name) fail(s.name, 'frontmatter missing `name`');
  else if (name !== s.name) fail(s.name, `frontmatter name \`${name}\` !== folder name`);

  // description present, no colon-space trap, has a trigger clause
  const desc = get('description');
  if (!desc) {
    fail(s.name, 'frontmatter missing `description`');
  } else {
    const quoted = /^["'|>]/.test(desc);
    if (!quoted && /:\s/.test(desc)) {
      fail(
        s.name,
        'unquoted `description` contains `: ` mid-value — YAML parses this as a nested mapping and the skill silently vanishes from `npx skills` discovery (the forge-debug trap). Use an em-dash or quote the value.'
      );
    }
    if (!/use (when|after|before)|when asked|use when/i.test(desc)) warn(s.name, 'description has no "Use when …" trigger clause');
  }

  // 200-line body ceiling
  const bodyLines = body.split('\n').length;
  if (bodyLines >= 200) fail(s.name, `SKILL.md body is ${bodyLines} lines (ceiling: <200)`);
  else if (bodyLines >= 185) warn(s.name, `SKILL.md body is ${bodyLines} lines (approaching the 200 ceiling)`);

  // Word ceiling: SKILL.md loads whole on every trigger. Past ~1,500 words, move
  // step-scoped detail into references/.
  const words = body.split(/\s+/).filter(Boolean).length;
  if (words > 1500) fail(s.name, `SKILL.md is ${words} words (ceiling: 1,500)`);

  // description length: Codex and Claude both truncate or drop long descriptions.
  if (desc && desc.length > 300) fail(s.name, `description is ${desc.length} chars (ceiling: 300)`);

  // internal flag / location agreement
  if (s.internal && !/^\s*internal:\s*true\s*$/m.test(parsed.fm)) {
    fail(s.name, 'lives in a dot-dir but frontmatter lacks `metadata.internal: true` (both are required for WIP skills)');
  }

  // referenced local files exist. Forms in the wild:
  //   `references/x.md`                     → the skill's own folder
  //   forge suite's `references/x.md`       → skills/forge/ (shared suite references)
  //   `forge-review`'s `references/x.md`    → that sibling skill's folder
  //   `forge/references/x.md`               → resolved against skills/
  const missing = new Set();
  const refRe = /((?:references|scripts|assets)\/[A-Za-z0-9._/-]+\.[a-z]{1,5})\b/g;
  for (const m of body.matchAll(refRe)) {
    const rel = m[1];
    if (rel.includes('*')) continue;
    const before = body.slice(Math.max(0, m.index - 40), m.index);
    if (/[a-z0-9-]\/$/.test(before)) continue; // part of a longer path — cross-skill form handles it
    const poss = before.match(/`?([a-z0-9-]+)`?(?:\s+suite)?['’]s?\s*[`(\n ]*$/i);
    const owner = poss && existsSync(join(SKILLS_DIR, poss[1])) ? poss[1] : null;
    const ok = owner
      ? existsSync(join(SKILLS_DIR, owner, rel))
      : existsSync(join(s.dir, rel)) || existsSync(join(SKILLS_DIR, 'forge', rel));
    if (!ok) missing.add(rel);
  }
  const crossRe = /(?:^|[\s`(])([a-z0-9-]+\/(?:references|scripts|assets)\/[A-Za-z0-9._/-]+\.[a-z]{1,5})\b/gm;
  for (const m of body.matchAll(crossRe)) {
    const rel = m[1];
    if (rel.includes('*')) continue;
    if (!existsSync(join(SKILLS_DIR, rel))) missing.add(`skills/${rel}`);
  }
  const dotRe = /\.\.\/([a-z0-9-]+\/(?:references|scripts|assets)\/[A-Za-z0-9._/-]+\.[a-z]{1,5})\b/g;
  for (const m of body.matchAll(dotRe)) {
    if (!existsSync(join(SKILLS_DIR, m[1]))) missing.add(`../${m[1]}`);
  }
  for (const rel of missing) fail(s.name, `references missing file: ${rel}`);
}

// Forge planning-discipline contracts — deterministic guardrails for the
// plan-bench regressions. Behavioral fixtures prove these clauses affect plans;
// this tier catches accidental deletion or weakening at edit time.
if (!allScope || inScope('forge-plan')) {
  const contracts = [
    ['forge-plan', 'references/phase-contract.md', /\*\*Hypothesis:\*\*[\s\S]*\*\*Falsification gate:\*\*[\s\S]*\*\*Fallback:\*\*[\s\S]*\*\*Trigger:\*\*[\s\S]*\*\*Last cheap decision phase:\*\*/i, 'complete material-bet risk contract'],
    ['forge-plan', 'references/phase-contract.md', /highest-impact[\s\S]*before (?:adding )?feature breadth/i, 'risk-first phase ordering'],
    ['forge-plan', 'references/phase-contract.md', /Human evidence gate[\s\S]*blocks every billing, scale, or polish phase/i, 'human evidence before billing/scale/polish'],
    ['forge-plan', 'references/phase-contract.md', /Release closure[\s\S]*security and authz[\s\S]*backup\/restore and upgrade[\s\S]*release smoke/i, 'explicit release closure'],
    ['forge-discovery', 'references/brief-contract.md', /Human evidence[\s\S]*Unknown[\s\S]*before billing\/scale\/polish/i, 'unknown real-use marker'],
    ['forge-harden', 'references/eng.md', /Numeric non-functional proof[\s\S]*Load\/latency[\s\S]*Crash\/restart[\s\S]*Backup\/restore[\s\S]*Upgrade/i, 'numeric scale/state proof'],
    ['forge-harden', 'references/eng.md', /External-reality pass[\s\S]*registries[\s\S]*OS\/CPU\/runtime\/browser platforms[\s\S]*real release path/i, 'external-reality pass'],
    ['forge-scope', 'SKILL.md', /added proof burden[\s\S]*paired cut or pressure valve/i, 'scope-expansion proof burden and pressure valve'],
    ['forge-harden', 'references/security.md', /Release-closure audit[\s\S]*authz matrix[\s\S]*packaged-artifact secret scan/i, 'security release closure'],
  ];
  for (const [skill, rel, pattern, label] of contracts) {
    const path = join(SKILLS_DIR, skill, rel);
    const raw = existsSync(path) ? readFileSync(path, 'utf8') : '';
    if (!pattern.test(raw)) fail(skill, `missing planning-discipline contract: ${label}`);
  }
}

// forge-principles worker card: generated from SKILL.md, consumed by factories (Arnold).
// A stale card means workers build to an older bar than the skill states.
if (inScope('forge-principles')) {
  try {
    execSync('node skills/forge-principles/scripts/card.mjs --check', { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    fail('forge-principles', `references/worker-card.md is stale: run node skills/forge-principles/scripts/card.mjs --write`);
  }
}

// skills/INDEX.md sync (public skills only). The table lives there rather than in
// CLAUDE.md: every skill's `description` is already always in the agent's context,
// so keeping ~2,200 tokens of richer duplicate in the always-loaded file is the
// "central repository of every practice" that context-engineering guidance warns off.
const claudeMd = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');
const indexPath = join(ROOT, 'skills/INDEX.md');
if (!existsSync(indexPath)) failures.push('index-sync: skills/INDEX.md is missing');
const indexMd = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '';
if (!/skills\/INDEX\.md/.test(claudeMd)) {
  failures.push('index-sync: CLAUDE.md must point at skills/INDEX.md');
}
const agentsMd = existsSync(join(ROOT, 'AGENTS.md')) ? readFileSync(join(ROOT, 'AGENTS.md'), 'utf8') : '';
if (!/CLAUDE\.md/.test(agentsMd) || !/shared source of truth/i.test(agentsMd)) {
  failures.push('guidance-sync: AGENTS.md must point Codex at the full shared CLAUDE.md guidance');
}
const indexed = new Set([...indexMd.matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|/gm)].map((m) => m[1]));
const publicSkills = skills.filter((s) => !s.internal);
for (const s of publicSkills) {
  if (!indexed.has(s.name)) fail(s.name, 'missing from the skills/INDEX.md table');
}
for (const name of indexed) {
  if (!inScope(name)) continue;
  if (!publicSkills.some((s) => s.name === name)) fail(name, 'in skills/INDEX.md but has no folder in skills/');
}

// `npx skills add . --list` discovery oracle — the ground truth for "will it install"
// Captured via a file, not a pipe: the CLI ends on `process.exit()`, which drops
// whatever is still buffered in a piped stdout, so reading it directly truncated the
// tail of the list at random and failed the last few skills for no reason.
const requireCli = process.env.EVALS_REQUIRE_CLI === '1';
const listFile = join(tmpdir(), `skills-list-${process.pid}.txt`);
try {
  execSync(`npx -y skills add . --list > ${JSON.stringify(listFile)} 2>/dev/null`, { cwd: ROOT, timeout: 180_000, stdio: ['ignore', 'ignore', 'pipe'] });
  const out = readFileSync(listFile, 'utf8');
  for (const s of publicSkills) {
    if (!out.includes(s.name)) fail(s.name, 'not discovered by `npx skills add . --list` — it will silently not install');
  }
} catch (e) {
  const msg = `could not run \`npx skills add . --list\` (${e.code || e.status || 'error'}) — discovery oracle skipped`;
  if (requireCli) failures.push(`cli-check: ${msg}`);
  else warnings.push(`cli-check: ${msg}`);
} finally {
  rmSync(listFile, { force: true });
}

// Mods (mods/<name>/): Claude Code plugins of function hooks, shipped through
// .claude-plugin/marketplace.json, not npx skills. Always in scope: there are few,
// and the engine's own `claude plugin validate` / `claude plugin test` are the gate.
const MODS_DIR = join(ROOT, 'mods');
const marketPath = join(ROOT, '.claude-plugin/marketplace.json');
const mods = existsSync(MODS_DIR)
  ? readdirSync(MODS_DIR).filter((d) => existsSync(join(MODS_DIR, d, '.claude-plugin/plugin.json')))
  : [];
if (mods.length > 0) {
  const market = existsSync(marketPath) ? JSON.parse(readFileSync(marketPath, 'utf8')) : { plugins: [] };
  if (!existsSync(marketPath)) failures.push('mods: .claude-plugin/marketplace.json is missing');
  const listedMods = new Map((market.plugins ?? []).map((p) => [p.name, p]));
  for (const name of mods) {
    const manifest = JSON.parse(readFileSync(join(MODS_DIR, name, '.claude-plugin/plugin.json'), 'utf8'));
    const entry = listedMods.get(name);
    if (manifest.name !== name) fail(`mod ${name}`, `plugin.json name "${manifest.name}" must equal the folder name`);
    if (!entry) fail(`mod ${name}`, 'missing from .claude-plugin/marketplace.json — it will not install');
    else if (entry.source !== `./mods/${name}`) fail(`mod ${name}`, `marketplace source must be "./mods/${name}"`);
    else if (entry.version !== manifest.version) fail(`mod ${name}`, `marketplace version ${entry.version} ≠ plugin.json ${manifest.version}`);
  }
  for (const name of listedMods.keys()) {
    if (!mods.includes(name)) fail(`mod ${name}`, 'in marketplace.json but has no folder in mods/');
  }
  const claude = (args, label) => {
    try {
      execSync(`claude ${args}`, { cwd: ROOT, timeout: 300_000, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      if (e.code === 'ENOENT' || e.status === 127) {
        const msg = `${label}: \`claude\` CLI not found — skipped`;
        if (requireCli) failures.push(msg);
        else warnings.push(msg);
        return;
      }
      const out = `${e.stdout ?? ''}${e.stderr ?? ''}`.trim().split('\n').slice(-6).join(' | ');
      failures.push(`${label}: \`claude ${args}\` failed — ${out}`);
    }
  };
  claude('plugin validate .', 'mods: marketplace');
  for (const name of mods) {
    claude(`plugin validate mods/${name}`, `mod ${name}`);
    const hasTests = existsSync(join(MODS_DIR, name, 'tests'));
    if (hasTests) claude(`plugin test mods/${name}`, `mod ${name} tests`);
    else warn(`mod ${name}`, 'no tests/ — `claude plugin test` has nothing to run');
  }
}

// Report
console.log(`Checked ${skills.length} skills (${publicSkills.length} public, scope: ${allScope ? 'all' : 'forge suite'}), ${mods.length} mod${mods.length === 1 ? '' : 's'}.`);
for (const w of warnings) console.log(`  WARN  ${w}`);
for (const f of failures) console.log(`  FAIL  ${f}`);
if (failures.length === 0) {
  console.log('Static validation: PASS');
} else {
  console.log(`Static validation: FAIL (${failures.length} failure${failures.length === 1 ? '' : 's'})`);
  process.exit(1);
}
