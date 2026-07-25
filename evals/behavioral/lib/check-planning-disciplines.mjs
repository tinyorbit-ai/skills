import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function checkPlanningDisciplines({ workdir }, profile) {
  const checks = [];
  const add = (name, pass, detail, required = true) => checks.push({ name, pass, detail, required });
  const read = (rel) => existsSync(join(workdir, rel)) ? readFileSync(join(workdir, rel), 'utf8') : '';
  const plan = read('wiki/plan.md');
  const arch = read('wiki/architecture.md');
  const brief = read('wiki/brief.md');
  const all = `${brief}\n${plan}\n${arch}`;

  const risks = plan.split(/^### Risk — /m).slice(1);
  add('material bets have risk contracts', risks.length > 0, `found ${risks.length}`);
  for (const [i, risk] of risks.entries()) {
    for (const field of ['Hypothesis', 'Falsification gate', 'Fallback', 'Trigger', 'Last cheap decision phase']) {
      add(`Risk ${i + 1} has ${field}`, new RegExp(`\\*\\*${field}:\\*\\*\\s*\\S`, 'i').test(risk));
    }
  }

  const phases = plan.split(/^## Phase /m).slice(1);
  add('uses exact machine-read phase blocks', phases.length >= 2, `found ${phases.length}`);
  add('early phase retires a named risk before breadth', phases.slice(0, 2).some((p) => /\*\*Risks retired:\*\*\s*(?!none\b)\S/i.test(p)));
  const releaseIndexes = phases.map((p, i) => (/^\d+\s+—\s+Release closure/im.test(p) ? i : -1)).filter((i) => i >= 0);
  const release = releaseIndexes.length ? phases[releaseIndexes[0]] : '';

  // Release closure is proportional: it earns a phase only when the build reaches
  // someone other than its author. `tiny` is the floor — nothing ships, so the
  // contract must close in one line rather than nine n/a bullets.
  if (profile === 'tiny') {
    const oneLiner = /Release closure:?\s*(?:—|-|is)?\s*n\/a/i.test(all);
    add('release closure closed in a single n/a line', oneLiner, oneLiner ? undefined : 'no `Release closure: n/a — …` line found');
    add('no Release closure phase for an unpublished single-user build', releaseIndexes.length === 0,
      releaseIndexes.length ? `phase present at index ${releaseIndexes[0]}` : undefined);
    // The mild failure: enumerating the nine items just to mark them n/a.
    const enumerated = ['secret scan', 'runbook', 'observab', 'packag', 'backup', 'upgrade', 'abuse']
      .filter((k) => new RegExp(k, 'i').test(plan));
    add('does not enumerate the release-closure items to n/a them', enumerated.length <= 1, `matched: ${enumerated.join(', ') || 'none'}`);
    // The real failure: inventing the work rather than declaring it inapplicable.
    add('no invented distribution work (packaging/installer/release phase)',
      !/^\d+\s+—[^\n]*(packag|distribut|installer|publish|release|deploy)/im.test(plan.replace(/^## Phase /gm, '')),
      undefined);
    add('no invented ops work (telemetry/metrics/alerting/runbooks)',
      !/telemetry|metrics endpoint|alerting|on-?call|runbook/i.test(plan));
    // Everything else still applies — a small project is not an excuse for a vague plan.
    add('phase count stays proportional to a one-file script', phases.length >= 2 && phases.length <= 4, `${phases.length} phases`);
    return checks;
  }

  add('final phase is explicit Release closure', releaseIndexes.length === 1 && releaseIndexes[0] === phases.length - 1, `release index ${releaseIndexes[0] ?? 'missing'} of ${phases.length}`);
  for (const [label, re] of [
    ['security/authz', /security[\s\S]*authz|authz[\s\S]*security/i],
    ['abuse', /abuse|rate.?limit/i],
    ['secret scanning', /secret scan/i],
    ['restore', /backup[\s/+-]*restore/i],
    ['upgrade', /upgrade/i],
    ['observability', /observab|alert/i],
    ['packaging/platforms', /packag[\s\S]*(platform|provider)|(?:platform|provider)[\s\S]*packag/i],
    ['runbooks', /runbook/i],
    ['release smoke', /release smoke|smoke[\s\S]*(artifact|image|tarball|package)/i],
  ]) add(`Release closure covers ${label}`, re.test(release));

  if (profile === 'small') {
    add('external reality checks registry/name/package path', /registry|npm view|package name/i.test(all) && /npm pack|tarball|npx/i.test(all));
    add('supported Node/platform matrix is explicit', /Node (?:20|22)|Windows|macOS|Linux/i.test(release));
  }

  if (profile === 'large') {
    add('numeric load and latency proof', /(?:p95|p99)[^\n]{0,80}(?:ms|s\b)|(?:ms|s\b)[^\n]{0,80}(?:p95|p99)/i.test(plan) && /\b(?:500|1000|1,000)\b/.test(plan));
    add('numeric resource ceiling', /(?:memory|CPU|disk|connection|queue)[^\n]{0,100}\b\d+\s*(?:MB|GB|%|connections?|jobs?)/i.test(plan));
    add('crash/restart invariant', /(?:kill|crash)[\s\S]{0,300}(?:restart|resume)[\s\S]{0,200}(?:0 lost|0 duplicate|within \d+)/i.test(plan));
    add('backup/restore drill has exact invariant', /backup[\s\S]{0,300}restore[\s\S]{0,300}(?:row count|checksum|\b0 lost|exact)/i.test(release));
    add('upgrade drill names prior artifact', /(?:previous|oldest|v\d)[^\n]{0,100}(?:image|version|tag)[\s\S]{0,300}upgrade/i.test(release) || /upgrade[\s\S]{0,300}(?:previous|oldest|v\d)/i.test(release));
    add('external provider/dependency facts are recorded', /official docs|registry|provider|licen[cs]e|supported version/i.test(all));
  }

  if (profile === 'product') {
    const human = plan.search(/Human evidence gate/i);
    const billing = plan.search(/^## Phase [^\n]*billing/im);
    add('human evidence gate is scheduled', human >= 0);
    add('human evidence gate precedes billing', billing < 0 || (human >= 0 && human < billing), `evidence ${human}, billing ${billing}`);
    add('human gate names people, task, evidence, and decision', /Human evidence gate:[\s\S]{0,500}(?:org|organizer|volunteer)[\s\S]{0,500}(?:observe|evidence|notes)[\s\S]{0,500}(?:go|change|stop)/i.test(plan));
    add('ambition expansion records proof burden', /proof burden/i.test(brief));
    add('ambition expansion records cut or pressure valve', /paired cut|pressure valve/i.test(brief));
  }

  return checks;
}
