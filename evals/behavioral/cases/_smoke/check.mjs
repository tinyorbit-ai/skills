import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export default async function check({ workdir }) {
  const file = join(workdir, 'hello.txt');
  const exists = existsSync(file);
  const content = exists ? readFileSync(file, 'utf8').trim() : '';
  return [
    { name: 'hello.txt created', pass: exists, required: true },
    { name: 'content is exactly "hello evals"', pass: content === 'hello evals', required: true, detail: exists ? `got: ${JSON.stringify(content)}` : 'file missing' },
  ];
}
