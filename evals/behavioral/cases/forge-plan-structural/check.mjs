import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Deterministic structural assertions against forge-plan's contract
// (phase block shape from skills/forge-plan/SKILL.md §4; wiki shape from forge/references/wiki.md).
export default async function check({ workdir }) {
  const checks = [];
  const add = (name, pass, detail, required = true) => checks.push({ name, pass, detail, required });

  const planPath = join(workdir, 'wiki/plan.md');
  const plan = existsSync(planPath) ? readFileSync(planPath, 'utf8') : '';
  add('wiki/plan.md exists and is not the stub', plan.length > 200 && !/Stub — filled by forge-plan/.test(plan));

  const phases = plan.split(/^## Phase /m).slice(1);
  add('has ≥ 2 ordered phases', phases.length >= 2, `found ${phases.length}`);

  for (const [i, p] of phases.entries()) {
    const n = `Phase ${i + 1}`;
    add(`${n} has **Branch:** with phase/ prefix`, /\*\*Branch:\*\*\s*`?phase\//.test(p));
    add(`${n} has **Goal:**`, /\*\*Goal:\*\*\s*\S/.test(p));
    add(`${n} has **Verifiable gate:**`, /\*\*Verifiable gate:\*\*\s*\S/.test(p));
    add(`${n} has **Design:** marker`, /\*\*Design:\*\*\s*(none|follow DESIGN\.md|explore|locked)/.test(p));
    const gate = p.match(/\*\*Verifiable gate:\*\*([\s\S]*?)(?=\n\*\*|$)/)?.[1] ?? '';
    add(
      `${n} gate is not bare hygiene (typecheck/lint/test only)`,
      !/^\s*`?(typecheck|lint|(npm |pnpm )?test)(\s*(&&|,)\s*`?(typecheck|lint|(npm |pnpm )?test))*`?\s*$/i.test(gate.trim()),
      undefined,
    );
  }

  const decisionsDir = join(workdir, 'wiki/decisions');
  const adrs = existsSync(decisionsDir)
    ? readdirSync(decisionsDir).filter((f) => /^\d{4}-[a-z0-9-]+\.md$/.test(f))
    : [];
  add('≥ 1 ADR written (NNNN-slug.md)', adrs.length >= 1, `found: ${adrs.join(', ') || 'none'}`);
  for (const f of adrs) {
    const adr = readFileSync(join(decisionsDir, f), 'utf8');
    add(`ADR ${f} has non-empty Alternatives`, /alternatives/i.test(adr) && adr.split(/alternatives[^\n]*/i)[1]?.trim().length > 20);
  }

  const arch = existsSync(join(workdir, 'wiki/architecture.md')) ? readFileSync(join(workdir, 'wiki/architecture.md'), 'utf8') : '';
  add('architecture.md replaced (not the stub)', arch.length > 300 && !/Stub — v1 written by forge-plan/.test(arch));
  add('architecture.md covers scale assumptions', /scale/i.test(arch));
  add('architecture.md has a parts list', /parts list/i.test(arch), undefined, false);

  const index = existsSync(join(workdir, 'wiki/index.md')) ? readFileSync(join(workdir, 'wiki/index.md'), 'utf8') : '';
  add('index.md links the new ADRs', adrs.length > 0 && adrs.some((f) => index.includes(f.replace(/\.md$/, ''))), undefined, false);

  // ---- economy-of-means script checks (no AI, no cost) ----
  const planAndArch = plan + '\n' + arch;
  const lines = planAndArch.split('\n');

  // the brief demands zero runtime dependencies — the plan must not install any
  const depHits = lines.filter((l) => /npm i(nstall)? +[a-z@]|pnpm add +[a-z@]|yarn add +[a-z@]/i.test(l));
  add('zero-dependency constraint honored (no package installs planned)', depHits.length === 0, depHits[0]?.trim());

  // simplicity.md's anti-patterns list, greppable; a line that rejects the
  // pattern ("no plugin system", "rejected", "out of scope") doesn't count
  const antiRe = /plugin|registry pattern|adapter layer|event bus|abstract (base )?class|config(uration)? (file|system|manager)|feature.flag|micro-?service/i;
  const negRe = /\bno\b|\bnot\b|avoid|reject|out of scope|non-goal|denied|deferred|instead of|rather than|without/i;
  const antiHits = lines.filter((l) => antiRe.test(l) && !negRe.test(l));
  add('no speculative machinery (simplicity.md anti-pattern sweep)', antiHits.length === 0, antiHits[0]?.trim());

  // every parts-list entry carries a reason (forge-plan §2b: the reason names
  // the brief clause it serves). Accept either format seen in the wild:
  //   - bullets:    "- part — reason with several words"
  //   - table rows: "| part | reason with several words |"
  const partsSection = arch.split(/#+\s*(?:the\s+)?parts list/i)[1]?.split(/\n#/)[0] ?? '';
  const sectionLines = partsSection.split('\n');
  const bullets = sectionLines.filter((l) => /^\s*[-*]\s+\S/.test(l));
  const tableRows = sectionLines.filter((l) => /^\s*\|.*\|/.test(l) && !/^\s*\|[\s\-:|]+\|\s*$/.test(l)).slice(1); // drop header
  const entries = bullets.length ? bullets : tableRows;
  // "reason" bar: at least two words — a verbatim brief-clause quote counts
  const justified = (l) => bullets.length
    ? /[—–-]\s+\S+(\s+\S+){1,}/.test(l)
    : (l.split('|')[2] ?? '').trim().split(/\s+/).filter(Boolean).length >= 2;
  const unjustified = entries.filter((l) => !justified(l));
  add(
    'every parts-list entry carries a because-clause',
    entries.length > 0 && unjustified.length === 0,
    entries.length === 0 ? 'no parts-list entries found (bullets or table)' : unjustified[0]?.trim()
  );

  // a 1-surface CLI brief doesn't need a 7-phase plan
  add('phase count proportional to the brief (≤ 6)', phases.length > 0 && phases.length <= 6, `found ${phases.length}`);

  return checks;
}
