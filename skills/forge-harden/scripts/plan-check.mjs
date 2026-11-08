#!/usr/bin/env node
// The plan checks code can settle, run by forge-harden's eng pass (references/eng.md):
// every `**Owns:**` path exists in the repo or is marked (new), and every `**Reads:**`
// item is written by the same or an earlier phase or is marked (outside).
//
//   node plan-check.mjs <plan.md> [--dir <repo>] [--json]
//
// Exit 0 when nothing is found, 1 with one line per finding, 2 when the plan can't be read.

import { readFileSync, existsSync } from 'node:fs';
import { isAbsolute, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// A field's text runs from its label to the next `**Label:**` line, so a list may wrap.
function field(block, name) {
  const at = block.search(new RegExp(`^\\*\\*${name}:\\*\\*`, 'm'));
  if (at < 0) return null;
  const rest = block.slice(at).replace(/^\*\*[^*]+:\*\*/, '');
  const next = rest.search(/^\*\*[A-Z][\w ]*:\*\*/m);
  return next < 0 ? rest : rest.slice(0, next);
}

// The backticked items of a list, each with the marker in brackets after it, if any.
function items(text) {
  if (!text) return [];
  return [...text.matchAll(/`([^`\n]+)`(?:\s*\((new|outside)\))?/g)].map((m) => ({ name: m[1].trim(), mark: m[2] ?? null }));
}

export function parse(plan) {
  const heads = [...plan.matchAll(/^## Phase (\d+)\s*[—-]\s*(.+)$/gm)];
  return heads.map((m, i) => {
    const block = plan.slice(m.index, i + 1 < heads.length ? heads[i + 1].index : plan.length);
    return {
      n: Number(m[1]),
      owns: items(field(block, 'Owns')),
      reads: items(field(block, 'Reads')),
      writes: items(field(block, 'Writes')),
    };
  });
}

export function check(plan, dir) {
  const phases = parse(plan);
  const findings = [];
  for (const p of phases) {
    for (const { name, mark } of p.owns) {
      if (mark === 'new') continue;
      const path = normalize(name);
      if (isAbsolute(path) || path.startsWith('..')) {
        findings.push(`phase ${p.n} owns ${name}, which is outside the repo`);
      } else if (!existsSync(join(dir, path))) {
        findings.push(`phase ${p.n} owns ${name}, which does not exist; fix the path, or mark it (new) if the phase creates it`);
      }
    }
  }
  // "Earlier" is plan order, as the phases are built.
  const written = new Set();
  for (const p of phases) {
    for (const w of p.writes) written.add(w.name);
    for (const { name, mark } of p.reads) {
      if (mark === 'outside' || written.has(name)) continue;
      const later = phases.find((q) => q !== p && q.writes.some((w) => w.name === name));
      findings.push(
        later
          ? `phase ${p.n} reads ${name}, which only phase ${later.n} writes, later; move the writer earlier`
          : `phase ${p.n} reads ${name}, which no phase in this plan writes; add the phase that writes it, or mark it (outside)`,
      );
    }
  }
  const count = (k) => phases.reduce((n, p) => n + p[k].length, 0);
  return { phases: phases.length, owns: count('owns'), reads: count('reads'), writes: count('writes'), findings };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const d = args.indexOf('--dir');
  const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--dir');
  if (!file || !existsSync(file)) {
    console.error(`plan-check: no plan at ${file ?? '(none given)'}`);
    process.exit(2);
  }
  const r = check(readFileSync(file, 'utf8'), resolve(d === -1 ? '.' : args[d + 1]));
  if (args.includes('--json')) console.log(JSON.stringify(r));
  else {
    for (const f of r.findings) console.log(f);
    console.log(`${r.findings.length ? 'FAIL' : 'ok'}: ${r.phases} phases, ${r.owns} owned paths, ${r.reads} reads, ${r.writes} writes, ${r.findings.length} findings`);
  }
  process.exit(r.findings.length ? 1 : 0);
}
