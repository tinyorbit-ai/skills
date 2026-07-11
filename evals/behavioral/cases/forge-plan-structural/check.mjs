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

  return checks;
}
