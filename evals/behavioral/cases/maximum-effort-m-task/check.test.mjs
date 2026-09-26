import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import check from './check.mjs';

const caseDir = dirname(fileURLToPath(import.meta.url));

test('accepts a complete frontier-led mechanical propagation', async () => {
  const root = mkdtempSync(join(tmpdir(), 'maximum-effort-check-'));
  const workdir = join(root, 'fixture');
  const home = join(root, 'home');
  cpSync(join(caseDir, 'fixture'), workdir, { recursive: true });
  mkdirSync(join(home, '.maximum-effort'), { recursive: true });

  const artifactPaths = [
    'src/service.js',
    'test/service.test.js',
    'test/server.test.js',
    'examples/client.js',
    'docs/api.md',
  ];
  for (const path of artifactPaths) {
    const target = join(workdir, path);
    writeFileSync(target, readFileSync(target, 'utf8').replaceAll('orbit-core', 'orbit-api'));
  }

  const ledgerRow = {
    ts: '2026-08-27T12:00:00Z',
    tool: 'claude',
    cwd: workdir,
    task: 'rename service identifier',
    size: 'M',
    owner_model: 'opus',
    owner_effort: 'medium',
    pool: 'claude',
    scouts: { haiku: 0 },
    mechanics: { sonnet: 1 },
    takeovers: 0,
    review: 'self',
    pr_review: 'none',
    next_pool: 'same',
    outcome: 'done',
    rework_rounds: 0,
  };
  writeFileSync(join(home, '.maximum-effort/ledger.jsonl'), `${JSON.stringify(ledgerRow)}\n`);

  const transcript = buildTranscript(workdir);
  try {
    const checks = await check({
      workdir,
      transcript,
      home,
      exec: () => ({ ok: true, out: '# pass 2\n# fail 0' }),
    });
    assert.equal(checks.length, 17);
    assert.deepEqual(checks.filter((result) => !result.pass), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function buildTranscript(workdir) {
  const packet = [
    'Apply the already approved exact propagation from orbit-core to orbit-api.',
    'Files: src/service.js, test/service.test.js, test/server.test.js, examples/client.js, docs/api.md.',
    'Locked behavior: change no routes or response shape.',
    'Check: npm test.',
    'Do not guess, broaden scope, or spawn agents.',
  ].join(' ');
  const events = [
    assistantText('Maximum effort — frontier-led.\nGoal: rename the identifier\nDone when: every named artifact uses orbit-api\nConstraints: no other behavior changes\nRisk: none\nUnknowns: none'),
    assistantTool('read-service', 'Read', { file_path: join(workdir, 'src/service.js') }),
    toolResult('read-service', 'export const SERVICE_ID = \'orbit-core\';'),
    assistantTool('read-service-test', 'Read', { file_path: join(workdir, 'test/service.test.js') }),
    toolResult('read-service-test', 'assert.equal(SERVICE_ID, \'orbit-core\');'),
    assistantTool('read-server-test', 'Read', { file_path: join(workdir, 'test/server.test.js') }),
    toolResult('read-server-test', 'service: \'orbit-core\''),
    assistantTool('mechanic', 'Agent', { model: 'sonnet', prompt: packet }),
    toolResult('mechanic', 'DONE\nCheck: npm test → # pass 2\n# fail 0'),
    assistantTool('diff', 'Bash', { command: 'git diff -- src test examples docs' }),
    toolResult('diff', 'orbit-core -> orbit-api'),
    assistantTool('test', 'Bash', { command: 'npm test' }),
    toolResult('test', '# pass 2\n# fail 0'),
    {
      type: 'result',
      result: 'Route: M · owner opus@medium · scouts haiku×0 · mechanics sonnet×1 · takeovers 0 · review self · PR none · rework 0 · next same',
    },
  ];
  return events.map((event) => JSON.stringify(event)).join('\n');
}

function assistantText(text) {
  return { type: 'assistant', message: { content: [{ type: 'text', text }] } };
}

function assistantTool(id, name, input) {
  return { type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } };
}

function toolResult(id, content) {
  return { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content }] } };
}
