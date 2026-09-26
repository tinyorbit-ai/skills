// Run: node --test skills/forge-principles/scripts/card.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildCard, cardWords, extractRules, CARD_PATH } from './card.mjs';

const skill = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'SKILL.md'), 'utf8');

test('same input gives the same card', () => {
  assert.equal(buildCard(skill), buildCard(skill));
});

test('card stays around 170 words', () => {
  const words = cardWords(buildCard(skill));
  assert.ok(words >= 140 && words <= 200, `card is ${words} words`);
});

test('every rule has a one-sentence lead', () => {
  for (const r of extractRules(skill)) {
    assert.ok(r.lead.length > 0 && r.lead.length <= 160, `${r.title} lead is ${r.lead.length} chars`);
  }
});

test('committed card matches SKILL.md', () => {
  assert.equal(readFileSync(CARD_PATH, 'utf8'), buildCard(skill));
});

test('a changed rule changes the card and its hash', () => {
  const edited = skill.replace('delete before you add', 'delete first');
  assert.notEqual(buildCard(edited), buildCard(skill));
});

test('missing Rules section fails loudly', () => {
  assert.throws(() => extractRules('# nothing here\n'), /Rules/);
});
