#!/usr/bin/env node
// forge status without an LLM: reads wiki/ and git, prints where the project is and the
// single next action, using the same ladder as forge/SKILL.md Step 1.
//
//   node status.mjs [--dir <repo>] [--project <slug>|root] [--json]
//
// A project's record lives in wiki/projects/<slug>/; `--project root` names the root brief and
// plan (references/projects.md). A repo with no project folders reports exactly as before.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);
const isStub = (text) => !text || /Status:\s*\*\*stub/i.test(text);

export function parsePhases(plan) {
  const phases = [];
  const re = /^## Phase (\d+)\s*[—-]\s*(.+)$/gm;
  const heads = [...plan.matchAll(re)];
  heads.forEach((m, i) => {
    const end = i + 1 < heads.length ? heads[i + 1].index : plan.length;
    const block = plan.slice(m.index, end);
    const field = (name) => block.match(new RegExp(`^\\*\\*${name}:\\*\\*\\s*(.+)$`, 'm'))?.[1].trim() ?? null;
    const design = field('Design');
    phases.push({
      n: Number(m[1]),
      title: m[2].trim(),
      branch: field('Branch')?.replace(/`/g, '') ?? null,
      gate: field('Verifiable gate'),
      design,
      designUnlocked: design ? /^explore\b/i.test(design) : false,
    });
  });
  return phases;
}

function git(dir, args) {
  try {
    return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

export const SLUG = /^[a-z0-9][a-z0-9-]*$/;
// `--project root` names the root brief and plan, so no project folder may be called that.
export const ROOT = 'root';

export function listProjects(dir) {
  const root = join(dir, 'wiki', 'projects');
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((d) => SLUG.test(d) && d !== ROOT && statSync(join(root, d)).isDirectory())
    .sort();
}

// Which project (references/projects.md): the one given (`root` for the root files), else
// the one whose plan names the checked-out branch, else the only folder when the root is a
// stub, else the caller has to choose. With project folders, a real root plan is never a
// silent default: a worker on its own branch would write the wrong plan.
// Returns { project: slug | null } (null = root) or { choose: [slug | 'root'] }.
export function pickProject(dir, given, branch) {
  if (given === ROOT) return { project: null };
  if (given !== null) return { project: given };
  const projects = listProjects(dir);
  if (projects.length === 0) return { project: null };
  const wiki = join(dir, 'wiki');
  const names = (file) => {
    const plan = read(file);
    return Boolean(branch && plan && parsePhases(plan).some((p) => p.branch === branch));
  };
  if (names(join(wiki, 'plan.md'))) return { project: null };
  const onBranch = projects.filter((slug) => names(join(wiki, 'projects', slug, 'plan.md')));
  if (onBranch.length === 1) return { project: onBranch[0] };
  const rootIsReal = !isStub(read(join(wiki, 'brief.md'))) || !isStub(read(join(wiki, 'plan.md')));
  if (!rootIsReal && projects.length === 1) return { project: projects[0] };
  return { choose: rootIsReal ? [ROOT, ...projects] : projects };
}

export function status(dir, given = null) {
  const wiki = join(dir, 'wiki');
  const branch = git(dir, ['branch', '--show-current']);
  const dirty = (git(dir, ['status', '--porcelain']) ?? '') !== '';
  const base = { forge: existsSync(wiki), branch, dirty };
  const next = (stage, skill, extra = {}) => ({ ...base, ...extra, stage, next: skill });

  if (!existsSync(wiki)) return next('setup', 'forge-init');
  if (given !== null && !SLUG.test(given)) throw new Error(`not a project slug: ${given}`);
  const pick = pickProject(dir, given, branch);
  if (pick.choose) return next('choose', 'forge <slug>', { projects: pick.choose });
  const project = pick.project;
  const home = project ? join(wiki, 'projects', project) : wiki;
  // Only a project run carries the `project` key, so root output stays as it was.
  if (project) base.project = project;

  const brief = read(join(home, 'brief.md'));
  if (isStub(brief)) return next('discovery', 'forge-discovery');
  const plan = read(join(home, 'plan.md'));
  if (isStub(plan)) return next('planning', 'forge-plan');

  const phases = parsePhases(plan);
  const log = read(join(home, 'build-log.md')) ?? '';
  const landed = [...log.matchAll(/^## Phase (\d+)\b/gm)].map((m) => Number(m[1]));
  const retro = read(join(home, 'retro.md')) ?? '';
  const retroCovers = [...retro.matchAll(/^## \d{4}-\d{2}-\d{2}.*?phases?\s+\d+\s*[–-]\s*(\d+)/gim)].map((m) => Number(m[1]));
  const hardened = /^## Review\b/m.test(plan);
  const locked = /\*\*Lock status:\*\*\s*locked\b/i.test(plan);
  const hasUi = phases.some((p) => p.design && !/^none\b/i.test(p.design));
  const designMd = existsSync(join(dir, 'DESIGN.md'));
  const info = {
    phases: phases.map((p) => ({ ...p, landed: landed.includes(p.n) })),
    landed,
    hardened,
    locked,
  };

  if (hasUi && (!designMd || phases.some((p) => p.designUnlocked))) {
    return next('design', designMd ? 'forge-design-explore' : 'forge-design-system', info);
  }
  if (!hardened) return next('hardening', 'forge-harden', info);
  if (!locked) return next('lock', 'forge (lock gate)', info);

  const current = phases.find((p) => p.branch && p.branch === branch && !landed.includes(p.n));
  const todo = current ?? phases.find((p) => !landed.includes(p.n));
  if (todo) {
    const onBranch = branch === todo.branch;
    return next('build', onBranch ? 'forge-build (continue) → forge-review → forge-ship' : 'forge-build', { ...info, phase: todo.n });
  }
  const lastLanded = Math.max(0, ...landed);
  if (!retroCovers.some((n) => n >= lastLanded)) return next('wrap-up', 'forge-retro', info);
  return next('done', null, info);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--dir');
  const p = args.indexOf('--project');
  let s;
  try {
    s = status(resolve(i === -1 ? '.' : args[i + 1]), p === -1 ? null : (args[p + 1] ?? ''));
  } catch (err) {
    console.error(`forge status: ${err.message}`);
    process.exit(2);
  }
  if (args.includes('--json')) {
    console.log(JSON.stringify(s));
  } else if (s.stage === 'choose') {
    console.log(
      [
        'forge status',
        `  Stage:    choose a project`,
        `  Projects: ${s.projects.join(', ')}`,
        `  Now:      on \`${s.branch ?? '?'}\`${s.dirty ? ' (uncommitted changes)' : ', clean'}`,
        `  Next:     ${s.next}`,
      ].join('\n'),
    );
  } else {
    const landed = s.landed?.length ? `phases ${s.landed.sort((a, b) => a - b).join(', ')}` : 'none';
    console.log(
      [
        'forge status',
        ...(s.project ? [`  Project:  ${s.project}`] : []),
        `  Stage:    ${s.stage}${s.phase ? ` (phase ${s.phase})` : ''}`,
        `  Plan:     ${s.phases ? `${s.phases.length} phases, hardened ${s.hardened ? '✓' : '–'}, locked ${s.locked ? '✓' : '–'}` : '–'}`,
        `  Landed:   ${landed}`,
        `  Now:      on \`${s.branch ?? '?'}\`${s.dirty ? ' (uncommitted changes)' : ', clean'}`,
        `  Next:     ${s.next ?? 'nothing, the plan is complete'}`,
      ].join('\n'),
    );
  }
}
