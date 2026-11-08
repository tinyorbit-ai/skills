#!/usr/bin/env node
// forge-init without an LLM: writes the wiki scaffold and the rules block from
// references/templates.md, and can add a project folder. Never overwrites a wiki file and
// never edits outside the rules markers, so a second run changes nothing.
//
//   node init.mjs [--dir <repo>] [--headless] [--new <slug>]
//
// --headless only says no one is there to ask; this script never asks anything.
// --new <slug> adds wiki/projects/<slug>/ and its line under `## Projects` in wiki/index.md
// (running the setup first when there is no wiki/ yet). Ends with the FORGE_RESULT line.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BEGIN = '<!-- BEGIN:forge-wiki-rules -->';
const END = '<!-- END:forge-wiki-rules -->';
const ONELINE = '_filled by forge-discovery_';
const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const PROJECT_FILES = ['brief', 'plan', 'build-log', 'retro', 'improvements'];

// Each `## \`wiki/…\`` heading with a fenced body is a file template; a heading with
// paths and no fence is a set of empty files (.gitkeep). The "Agent rules block" heading
// holds the block.
export function parseTemplates(text) {
  const sections = [];
  let fence = null;
  for (const line of text.split('\n')) {
    if (fence !== null) {
      if (line === '```') {
        if (sections.length) sections.at(-1).body ??= fence.join('\n') + '\n';
        fence = null;
      } else fence.push(line);
    } else if (/^```/.test(line)) fence = [];
    else if (line.startsWith('## ')) sections.push({ heading: line.slice(3), body: null });
  }
  const files = new Map();
  let rules = null;
  for (const { heading, body } of sections) {
    if (/^Agent rules block/.test(heading)) {
      rules = body.trim();
      continue;
    }
    const paths = [...heading.matchAll(/`(wiki\/[^`]+)`/g)].map((m) => m[1]);
    if (body !== null && paths.length === 1) files.set(paths[0], body);
    else if (body === null) for (const p of paths) files.set(p, '');
  }
  return { files, rules };
}

function git(dir, args) {
  try {
    return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

// The branch phases merge back into: origin's default branch, else main or master when
// one exists, else the branch checked out now. Not just the current branch, since a
// headless run often starts on a work branch.
export function baseBranch(root) {
  const remote = git(root, ['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD']);
  if (remote) return remote.replace(/^origin\//, '');
  for (const name of ['main', 'master']) {
    if (git(root, ['rev-parse', '--verify', '--quiet', `refs/heads/${name}`]) !== null) return name;
  }
  return git(root, ['symbolic-ref', '--short', 'HEAD']) || 'main';
}

const BASE_LINE = /^\*\*Base branch:\*\*.*$/m;

function fill(text, vars) {
  return text.replace(/\{(PROJECT|ONELINE|BASE)\}/g, (_, k) => vars[k]);
}

export function injectRules(text, block) {
  const i = text.indexOf(BEGIN);
  const j = text.indexOf(END);
  if (i === -1 && j === -1) return text.replace(/\s*$/, '') + (text.trim() ? '\n\n' : '') + block + '\n';
  if (i === -1 || j < i) return null; // one marker without the other: leave the file alone
  return text.slice(0, i) + block + text.slice(j + END.length);
}

// A CLAUDE.md that pulls in AGENTS.md already reads the block from there.
const importsAgents = (text) => /^@(?:\.\/)?AGENTS\.md\s*$/m.test(text);
const hasBlock = (file) => {
  if (!existsSync(file)) return false;
  const text = readFileSync(file, 'utf8');
  const i = text.indexOf(BEGIN);
  return i !== -1 && text.indexOf(END) > i;
};

// The project version of a root template: its own links, its own branch form.
export function projectTemplate(text, slug) {
  let out = text.replaceAll('phase/<n>-<slug>', `phase/${slug}-<n>-<name>`);
  for (const f of PROJECT_FILES) out = out.replaceAll(`[[${f}]]`, `[[projects/${slug}/${f}]]`);
  return out;
}

export function projectIndexLine(slug) {
  const link = (f) => `[[projects/${slug}/${f}]]`;
  return `- **${slug}** — ${ONELINE} · ${PROJECT_FILES.map(link).join(' · ')}`;
}

export function addProjectToIndex(index, slug) {
  if (index.includes(`[[projects/${slug}/brief]]`)) return index;
  const line = projectIndexLine(slug);
  const lines = index.split('\n');
  const at = lines.findIndex((l) => /^## Projects\s*$/.test(l));
  if (at !== -1) {
    let end = lines.findIndex((l, k) => k > at && /^## /.test(l));
    if (end === -1) end = lines.length;
    while (end > at + 1 && lines[end - 1].trim() === '') end--;
    lines.splice(end, 0, line);
    return lines.join('\n');
  }
  const section = ['## Projects', '', 'Each project keeps its own record in `wiki/projects/<slug>/`.', '', line, ''];
  const kb = lines.findIndex((l) => /^## Knowledge base\s*$/.test(l));
  if (kb !== -1) {
    lines.splice(kb, 0, ...section);
    return lines.join('\n');
  }
  return index.replace(/\s*$/, '') + '\n\n' + section.join('\n');
}

export function init(dir, { slug = null } = {}) {
  const root = git(dir, ['rev-parse', '--show-toplevel']);
  if (!root) return { status: 'blocked', notes: 'not a git repository; run git init first', created: [], agents: {} };
  const { files, rules } = parseTemplates(readFileSync(join(HERE, '..', 'references', 'templates.md'), 'utf8'));
  const vars = { PROJECT: basename(root), ONELINE, BASE: baseBranch(root) };
  const created = [];
  const agents = {};
  const write = (rel, text) => {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, text);
  };
  const writeNew = (rel, text) => {
    if (existsSync(join(root, rel))) return;
    write(rel, text);
    created.push(rel);
  };

  if (!slug || !existsSync(join(root, 'wiki'))) {
    for (const [rel, text] of files) writeNew(rel, fill(text, vars));
    for (const name of ['AGENTS.md', 'CLAUDE.md']) {
      const abs = join(root, name);
      if (!existsSync(abs)) {
        const head = name === 'CLAUDE.md' && existsSync(join(root, 'AGENTS.md')) ? '@AGENTS.md\n\n' : '';
        write(name, head + rules + '\n');
        agents[name] = 'created';
        continue;
      }
      const before = readFileSync(abs, 'utf8');
      if (name === 'CLAUDE.md' && importsAgents(before) && !before.includes(BEGIN) && !before.includes(END) && hasBlock(join(root, 'AGENTS.md'))) {
        agents[name] = 'unchanged (imports @AGENTS.md)';
        continue;
      }
      const after = injectRules(before, rules);
      if (after === null) agents[name] = 'markers broken, left alone';
      else if (after === before) agents[name] = 'unchanged';
      else {
        write(name, after);
        agents[name] = 'updated';
      }
    }
  }

  if (slug) {
    const p = (f) => `wiki/projects/${slug}/${f}`;
    const projectVars = { ...vars, PROJECT: slug };
    // A project merges where the root plan says the repo merges, when it says so.
    const rootPlan = existsSync(join(root, 'wiki', 'plan.md')) ? readFileSync(join(root, 'wiki', 'plan.md'), 'utf8') : '';
    const baseLine = rootPlan.match(BASE_LINE)?.[0];
    for (const f of PROJECT_FILES) {
      let text = projectTemplate(fill(files.get(`wiki/${f}.md`), projectVars), slug);
      if (f === 'plan' && baseLine) text = text.replace(BASE_LINE, () => baseLine);
      writeNew(p(`${f}.md`), text);
    }
    writeNew(p('design/.gitkeep'), '');
    const indexPath = join(root, 'wiki', 'index.md');
    const index = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '';
    const next = addProjectToIndex(index, slug);
    if (next !== index) {
      write('wiki/index.md', next);
      created.push(`wiki/index.md (## Projects: ${slug})`);
    }
  }

  const broken = Object.entries(agents).filter(([, v]) => v.startsWith('markers broken')).map(([k]) => k);
  const agentNotes = Object.entries(agents).map(([k, v]) => `${k} ${v}`).join(', ');
  const changed = created.length || Object.values(agents).some((v) => v === 'created' || v === 'updated');
  const notes = [
    created.length ? `created ${created.length} files` : null,
    agentNotes ? `rules: ${agentNotes}` : null,
    changed ? null : 'nothing to change',
    broken.length ? `fix the forge-wiki-rules markers in ${broken.join(', ')}` : null,
  ].filter(Boolean).join('; ');
  return { status: broken.length ? 'blocked' : 'done', notes, created, agents };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const arg = (name) => (args.indexOf(name) === -1 ? null : (args[args.indexOf(name) + 1] ?? ''));
  const slug = arg('--new');
  if (slug !== null && !SLUG.test(slug)) {
    console.error(`forge-init: not a project slug: ${slug}`);
    process.exit(2);
  }
  const r = init(resolve(arg('--dir') ?? '.'), { slug });
  for (const f of r.created) console.log(`created  ${f}`);
  for (const [name, what] of Object.entries(r.agents)) console.log(`rules    ${name}: ${what}`);
  const result = { skill: 'forge-init', status: r.status, phase: null, gate: 'n/a', notes: r.notes };
  console.log(`FORGE_RESULT ${JSON.stringify(result)}`);
  process.exit(r.status === 'done' ? 0 : 1);
}
