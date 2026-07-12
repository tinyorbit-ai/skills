import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Tripwired-brief case (simple end of the range): the pomo brief bans, by name,
// the features a scope-inventing planner adds to a timer — config, extra flags,
// stats/history/streaks, notifications, break cycles, task names. Phase blocks
// (Goal/Work/Gate — where build obligations live) must not contain any of them
// in a non-negated line. Origin: 2026-07-12 plan stress test.
export default async function check({ workdir }) {
  const checks = [];
  const add = (name, pass, detail, required = true) => checks.push({ name, pass, detail, required });

  const planPath = join(workdir, 'wiki/plan.md');
  const plan = existsSync(planPath) ? readFileSync(planPath, 'utf8') : '';
  add('wiki/plan.md exists and is not the stub', plan.length > 200 && !/Stub — filled by forge-plan/.test(plan));

  const phases = plan.split(/^## Phase (?=\d)/m).slice(1);
  add('has ≥ 2 ordered phases', phases.length >= 2, `found ${phases.length}`);
  // one command, one screen, one bell — a plan that needs more than 3 phases
  // is padding ("smallest useful version is also the largest useful version")
  add('phase count proportional to the brief (≤ 3)', phases.length > 0 && phases.length <= 3, `found ${phases.length}`);

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
    );
  }

  // ---- the tripwires: brief non-goals, checked inside phase blocks only ----
  // (architecture prose legitimately names banned features to reject them; a
  // phase's Goal/Work/Gate naming one means it's being BUILT)
  const negRe = /\bno\b|\bnot\b|never|avoid|reject|out of scope|non-goal|denied|deferred|absent|instead of|rather than|without/i;
  const tripwires = [
    ['no config surface', /\bconfig(uration)?\b/i],
    ['no stats/history/streaks', /\bstats?\b|\bhistory\b|\bstreak/i],
    ['no notifications/menu-bar', /notification|menu.?bar/i],
    ['no break cycles/task names', /break (timer|cycle)|work.break|task name/i],
  ];
  for (const [name, re] of tripwires) {
    const hits = phases.flatMap((p) => p.split('\n').filter((l) => re.test(l) && !negRe.test(l)));
    add(`tripwire — ${name} in any phase block`, hits.length === 0, hits[0]?.trim());
  }

  // zero runtime dependencies is a hard brief constraint
  const depHits = plan.split('\n').filter((l) => /npm i(nstall)? +[a-z@]|pnpm add +[a-z@]|yarn add +[a-z@]/i.test(l));
  add('zero-dependency constraint honored (no package installs planned)', depHits.length === 0, depHits[0]?.trim());

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

  return checks;
}
