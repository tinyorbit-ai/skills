// Run: node --test skills/forge-harden/scripts/plan-check.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { check } from './plan-check.mjs';

function repo(files) {
  const dir = mkdtempSync(join(tmpdir(), 'plan-check-'));
  for (const f of files) {
    mkdirSync(join(dir, f, '..'), { recursive: true });
    writeFileSync(join(dir, f), '');
  }
  return dir;
}

const plan = `# Plan
## Phase 1 — Accounts
**Branch:** \`phase/app-1-accounts\`
**Owns:** \`ios/App/RootView.swift\`, \`ios/App/Account.swift\` (new)
**Writes:** \`user.id\`
**QA:** xcode

## Phase 2 — Billing
**Branch:** \`phase/app-2-billing\`
**Owns:** \`ios/RootView.swift\`,
  \`../outside.txt\`
**Reads:** \`user.id\`, \`user.plan\`, \`store.prices\` (outside)
**Writes:** none

## Phase 3 — Plans
**Owns:** \`ios/App/RootView.swift\`
**Writes:** \`user.plan\`
`;

test('a guessed path, a path outside the repo and a read written later are named', () => {
  const r = check(plan, repo(['ios/App/RootView.swift']));
  assert.deepEqual(r.findings, [
    'phase 2 owns ios/RootView.swift, which does not exist; fix the path, or mark it (new) if the phase creates it',
    'phase 2 owns ../outside.txt, which is outside the repo',
    'phase 2 reads user.plan, which only phase 3 writes, later; move the writer earlier',
  ]);
});

test('a read nobody writes is named', () => {
  const r = check(plan.replace('**Writes:** `user.plan`', '**Writes:** none'), repo(['ios/App/RootView.swift', 'ios/RootView.swift', '../x']));
  assert.ok(r.findings.includes('phase 2 reads user.plan, which no phase in this plan writes; add the phase that writes it, or mark it (outside)'));
});

test('a plan with no Owns or Reads lines has nothing to find', () => {
  const r = check('## Phase 1 — Thin\n**Branch:** `phase/1-thin`\n**Verifiable gate:** `npm test`\n', repo([]));
  assert.deepEqual(r.findings, []);
  assert.equal(r.phases, 1);
});

test('a path an earlier phase creates is fine later, and so is anything under it', () => {
  const p = `## Phase 1 — Helper
**Owns:** \`src/helper/\` (new, the helper), \`src/Thing.ts\` (NEW)
**Writes:** \`helper.api\`

## Phase 2 — Use it
**Owns:** \`src/helper/index.ts\`, \`src/helper\`, \`src/Thing.ts\`, \`src/helperish.ts\`
**Reads:** \`helper.api\`, \`billing.rates\` (Outside), \`tax.table\` (outside, from finance)
`;
  const r = check(p, repo([]));
  assert.deepEqual(r.findings, [
    'phase 2 owns src/helperish.ts, which does not exist; fix the path, or mark it (new) if the phase creates it',
  ]);
});

test('a path created only in a later phase still fails earlier', () => {
  const p = `## Phase 1 — Early
**Owns:** \`src/late.ts\`

## Phase 2 — Late
**Owns:** \`src/late.ts\` (new)
`;
  assert.deepEqual(check(p, repo([])).findings, [
    'phase 1 owns src/late.ts, which does not exist; fix the path, or mark it (new) if the phase creates it',
  ]);
});
