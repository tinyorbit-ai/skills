#!/usr/bin/env node
// forge status without an LLM: reads wiki/ and git, prints where the project is and the
// single next action, using the same ladder as forge/SKILL.md Step 1.
//
//   node status.mjs [--dir <repo>] [--json]

import { readFileSync, existsSync } from 'node:fs';
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

export function status(dir) {
  const wiki = join(dir, 'wiki');
  const branch = git(dir, ['branch', '--show-current']);
  const dirty = (git(dir, ['status', '--porcelain']) ?? '') !== '';
  const base = { forge: existsSync(wiki), branch, dirty };
  const next = (stage, skill, extra = {}) => ({ ...base, ...extra, stage, next: skill });

  if (!existsSync(wiki)) return next('setup', 'forge-init');
  const brief = read(join(wiki, 'brief.md'));
  if (isStub(brief)) return next('discovery', 'forge-discovery');
  const plan = read(join(wiki, 'plan.md'));
  if (isStub(plan)) return next('planning', 'forge-plan');

  const phases = parsePhases(plan);
  const log = read(join(wiki, 'build-log.md')) ?? '';
  const landed = [...log.matchAll(/^## Phase (\d+)\b/gm)].map((m) => Number(m[1]));
  const retro = read(join(wiki, 'retro.md')) ?? '';
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
  const s = status(resolve(i === -1 ? '.' : args[i + 1]));
  if (args.includes('--json')) {
    console.log(JSON.stringify(s));
  } else {
    const landed = s.landed?.length ? `phases ${s.landed.sort((a, b) => a - b).join(', ')}` : 'none';
    console.log(
      [
        'forge status',
        `  Stage:    ${s.stage}${s.phase ? ` (phase ${s.phase})` : ''}`,
        `  Plan:     ${s.phases ? `${s.phases.length} phases, hardened ${s.hardened ? '✓' : '–'}, locked ${s.locked ? '✓' : '–'}` : '–'}`,
        `  Landed:   ${landed}`,
        `  Now:      on \`${s.branch ?? '?'}\`${s.dirty ? ' (uncommitted changes)' : ', clean'}`,
        `  Next:     ${s.next ?? 'nothing, the plan is complete'}`,
      ].join('\n'),
    );
  }
}
