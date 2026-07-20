#!/usr/bin/env node
// Tier 0 — static validation of SKILL.md files.
// Scope: the forge suite (forge + forge-*) for now; pass --all to validate every skill.
// Deterministic, no tokens. Run: node evals/static/validate.mjs
// Exit 1 on any failure. Set EVALS_REQUIRE_CLI=1 to make the `npx skills` discovery check mandatory.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, basename } from 'node:path';

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
    ['forge-harden-eng', 'SKILL.md', /Numeric non-functional proof[\s\S]*Load\/latency[\s\S]*Crash\/restart[\s\S]*Backup\/restore[\s\S]*Upgrade/i, 'numeric scale/state proof'],
    ['forge-harden-eng', 'SKILL.md', /External-reality pass[\s\S]*registries[\s\S]*OS\/CPU\/runtime\/browser platforms[\s\S]*real release path/i, 'external-reality pass'],
    ['forge-ambition', 'SKILL.md', /Added proof burden[\s\S]*Paired cut or pressure valve/i, 'ambition proof burden and pressure valve'],
    ['forge-harden-scope', 'SKILL.md', /added proof burden[\s\S]*paired cut or pressure valve/i, 'scope-expansion proof burden and pressure valve'],
    ['forge-harden-security', 'SKILL.md', /Release-closure audit[\s\S]*authz matrix[\s\S]*packaged-artifact secret scan/i, 'security release closure'],
  ];
  for (const [skill, rel, pattern, label] of contracts) {
    const path = join(SKILLS_DIR, skill, rel);
    const raw = existsSync(path) ? readFileSync(path, 'utf8') : '';
    if (!pattern.test(raw)) fail(skill, `missing planning-discipline contract: ${label}`);
  }
}

// CLAUDE.md skills-index sync (public skills only)
const claudeMd = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');
const agentsMd = existsSync(join(ROOT, 'AGENTS.md')) ? readFileSync(join(ROOT, 'AGENTS.md'), 'utf8') : '';
if (!/CLAUDE\.md/.test(agentsMd) || !/shared source of truth/i.test(agentsMd)) {
  failures.push('guidance-sync: AGENTS.md must point Codex at the full shared CLAUDE.md guidance');
}
const indexed = new Set([...claudeMd.matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|/gm)].map((m) => m[1]));
const publicSkills = skills.filter((s) => !s.internal);
for (const s of publicSkills) {
  if (!indexed.has(s.name)) fail(s.name, 'missing from the CLAUDE.md skills index table');
}
for (const name of indexed) {
  if (!inScope(name)) continue;
  if (!publicSkills.some((s) => s.name === name)) fail(name, 'in the CLAUDE.md skills index but has no folder in skills/');
}

// `npx skills add . --list` discovery oracle — the ground truth for "will it install"
const requireCli = process.env.EVALS_REQUIRE_CLI === '1';
try {
  const out = execSync('npx -y skills add . --list', { cwd: ROOT, timeout: 180_000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  for (const s of publicSkills) {
    if (!out.includes(s.name)) fail(s.name, 'not discovered by `npx skills add . --list` — it will silently not install');
  }
} catch (e) {
  const msg = `could not run \`npx skills add . --list\` (${e.code || e.status || 'error'}) — discovery oracle skipped`;
  if (requireCli) failures.push(`cli-check: ${msg}`);
  else warnings.push(`cli-check: ${msg}`);
}

// Report
console.log(`Checked ${skills.length} skills (${publicSkills.length} public, scope: ${allScope ? 'all' : 'forge suite'}).`);
for (const w of warnings) console.log(`  WARN  ${w}`);
for (const f of failures) console.log(`  FAIL  ${f}`);
if (failures.length === 0) {
  console.log('Static validation: PASS');
} else {
  console.log(`Static validation: FAIL (${failures.length} failure${failures.length === 1 ? '' : 's'})`);
  process.exit(1);
}
