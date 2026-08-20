import { timingSafeEqual } from 'node:crypto';

const users = new Map([
  ['ada', 'correct-horse'],
  ['linus', 'battery-staple'],
]);

export function login(username, password) {
  const expected = users.get(username);
  if (expected === undefined) return null;
  const given = Buffer.from(String(password));
  const want = Buffer.from(expected);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;
  return `token-${username}-${Date.now()}`;
}
