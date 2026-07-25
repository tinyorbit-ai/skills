import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { unnegatedHits, obligationText } from '../../lib/text.mjs';

// Tripwired-brief case (comprehensive end of the range): the shelfie brief bans,
// by name, the growth directions a scope-inventing planner reaches for — social/
// multi-user, recommendations/ratings, PWA/offline mode, export APIs/RSS, e-book
// handling. Phase blocks (Goal/Work/Gate — where build obligations live) must not
// contain any of them in a non-negated line. The first live run of this brief
// leaked an invented behavior (status auto-advance) and a config-surface stretch
// (three env vars vs the brief's one) — the judge dimension behavior_traceability
// exists to catch that class. Origin: 2026-07-12 plan stress test.
export default async function check({ workdir }) {
  const checks = [];
  const add = (name, pass, detail, required = true) => checks.push({ name, pass, detail, required });

  const planPath = join(workdir, 'wiki/plan.md');
  const plan = existsSync(planPath) ? readFileSync(planPath, 'utf8') : '';
  add('wiki/plan.md exists and is not the stub', plan.length > 200 && !/Stub — filled by forge-plan/.test(plan));

  const phases = plan.split(/^## Phase (?=\d)/m).slice(1);
  // four surfaces + auth + import + packaging — fewer than 5 phases means
  // slices got bundled; more than 9 means padding
  add('phase count proportional to the brief (5–9)', phases.length >= 5 && phases.length <= 9, `found ${phases.length}`);

  let uiPhases = 0;
  for (const [i, p] of phases.entries()) {
    const n = `Phase ${i + 1}`;
    add(`${n} has **Branch:** with phase/ prefix`, /\*\*Branch:\*\*\s*`?phase\//.test(p));
    add(`${n} has **Goal:**`, /\*\*Goal:\*\*\s*\S/.test(p));
    add(`${n} has **Verifiable gate:**`, /\*\*Verifiable gate:\*\*\s*\S/.test(p));
    add(`${n} has **Design:** marker`, /\*\*Design:\*\*\s*(none|follow DESIGN\.md|explore|locked)/.test(p));
    if (/\*\*Design:\*\*\s*(follow|explore|locked)/.test(p)) uiPhases += 1;
    const gate = p.match(/\*\*Verifiable gate:\*\*([\s\S]*?)(?=\n\*\*|$)/)?.[1] ?? '';
    add(
      `${n} gate is not bare hygiene (typecheck/lint/test only)`,
      !/^\s*`?(typecheck|lint|(npm |pnpm )?test)(\s*(&&|,)\s*`?(typecheck|lint|(npm |pnpm )?test))*`?\s*$/i.test(gate.trim()),
    );
  }
  // a web app whose plan routes no phase through the design cycle skipped §6
  add('at least one phase routes through design (follow/explore/locked)', uiPhases >= 1, `found ${uiPhases}`);

  // ---- the tripwires: brief non-goals, checked inside phase blocks only ----
  const tripwires = [
    ['single user, no social', /\bsocial\b|\bsharing\b|\bfriends?\b|multi.?user|registration|sign.?up|\baccounts?\b/i],
    ['no recommendations/ratings', /recommendation|\bratings?\b/i],
    ['no PWA/offline mode', /\bPWA\b|service.?worker|offline (mode|support|first)/i],
    ['no export API/RSS', /\bRSS\b|export (API|endpoint)|\bwebhooks?\b/i],
    ['no e-book file handling', /\be-?books?\b|\bepub\b|\bmobi\b/i],
  ];
  for (const [name, re] of tripwires) {
    const hits = phases.flatMap((p) => unnegatedHits(obligationText(p), re));
    add(`tripwire — ${name} in any phase block`, hits.length === 0, hits[0]?.trim());
  }

  // the brief says "one env var for the passphrase hash" — count what the plan
  // actually reads. Informational: extra defaulted knobs are a judge call
  // (behavior_traceability), not a hard fail, but the drift should be visible.
  const arch = existsSync(join(workdir, 'wiki/architecture.md')) ? readFileSync(join(workdir, 'wiki/architecture.md'), 'utf8') : '';
  const envTokens = [...new Set((plan + '\n' + arch).match(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g) ?? [])]
    .filter((t) => !/^(HTTP|HTML|CSS|SQL|CSV|ISBN|ADR|API|WAL|README|DESIGN|SKILL|CLAUDE|AGENTS)/.test(t));
  add('config surface stays near the brief\'s "one env var"', envTokens.length <= 1, `env-like tokens: ${envTokens.join(', ') || 'none'}`, false);

  const decisionsDir = join(workdir, 'wiki/decisions');
  const adrs = existsSync(decisionsDir)
    ? readdirSync(decisionsDir).filter((f) => /^\d{4}-[a-z0-9-]+\.md$/.test(f))
    : [];
  // stack, auth, degrade policy, import model, stats semantics are all real decisions
  add('≥ 3 ADRs written (NNNN-slug.md)', adrs.length >= 3, `found: ${adrs.join(', ') || 'none'}`);
  for (const f of adrs) {
    const adr = readFileSync(join(decisionsDir, f), 'utf8');
    add(`ADR ${f} has non-empty Alternatives`, /alternatives/i.test(adr) && adr.split(/alternatives[^\n]*/i)[1]?.trim().length > 20);
  }

  add('architecture.md replaced (not the stub)', arch.length > 300 && !/Stub — v1 written by forge-plan/.test(arch));
  add('architecture.md covers scale assumptions', /scale/i.test(arch));

  return checks;
}
