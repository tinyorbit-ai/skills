import { readFileSync, existsSync } from 'node:fs';
import { join, relative, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';

const MECHANIC = /sonnet|terra/i;
const FRONTIER = /opus|fable|sol/i;
const SOURCE_PATH = /(?:src|test|examples|docs)\//;
const BASH_WRITE = /\b(?:apply_patch|sed\s+-i|perl\s+-pi|tee|cp|mv)\b|(?:^|\s)>\s*(?!\/dev\/null)/m;

export default async function check({ workdir, transcript, exec, home = homedir() }) {
  const checks = [];
  const add = (name, pass, detail, required = true) => checks.push({ name, pass, detail, required });
  const events = transcript.split('\n').flatMap((line) => {
    try { return line ? [JSON.parse(line)] : []; } catch { return []; }
  });
  const calls = [];
  const texts = [];
  const results = new Map();
  for (const [eventIndex, event] of events.entries()) {
    if (event.type === 'assistant' && !event.parent_tool_use_id) {
      for (const block of event.message?.content ?? []) {
        if (block.type === 'tool_use') {
          calls.push({ name: block.name, input: block.input ?? {}, id: block.id, eventIndex });
        }
        if (block.type === 'text') texts.push(block.text);
      }
    }
    if (event.type === 'user' && !event.parent_tool_use_id) {
      for (const block of event.message?.content ?? []) {
        if (block.type === 'tool_result' && block.tool_use_id) {
          results.set(block.tool_use_id, { content: block.content, eventIndex });
        }
      }
    }
  }

  const resultText = (id) => {
    const content = results.get(id)?.content;
    return typeof content === 'string' ? content : JSON.stringify(content ?? '');
  };
  const finalText = events.findLast((event) => event.type === 'result')?.result || texts.at(-1) || '';
  const prose = texts.join('\n');
  const pathOf = (call) => String(call.input.file_path ?? call.input.notebook_path ?? '');
  const relativePath = (path) => relative(workdir, isAbsolute(path) ? path : join(workdir, path));
  const bash = calls
    .filter((call) => call.name === 'Bash')
    .map((call) => ({ ...call, command: String(call.input.command ?? '') }));
  const spawns = calls
    .filter((call) => call.name === 'Agent' || call.name === 'Task')
    .map((call) => ({ ...call, model: String(call.input.model ?? 'inherit'), prompt: String(call.input.prompt ?? '') }));
  const mechanics = spawns.filter((spawn) => MECHANIC.test(spawn.model));
  const reviewers = spawns.filter((spawn) => FRONTIER.test(spawn.model));
  const mechanic = mechanics[0];
  const mechanicResult = mechanic ? results.get(mechanic.id) : null;
  const mechanicText = mechanic ? resultText(mechanic.id) : '';

  add('skill invoked', /Maximum effort — frontier-led/.test(prose));
  add('brief written (Goal / Done when / Constraints / Risk / Unknowns)',
    /Goal:[\s\S]{0,500}Done when:[\s\S]{0,500}Constraints:[\s\S]{0,500}Risk:[\s\S]{0,500}Unknowns:/.test(prose));

  const requiredReads = ['src/service.js', 'test/service.test.js', 'test/server.test.js'];
  const readsBeforeMechanic = calls
    .filter((call) => call.name === 'Read' && call.eventIndex < (mechanic?.eventIndex ?? -1))
    .map((call) => relativePath(pathOf(call)));
  add('frontier owner reads decision-critical source and tests before delegating',
    requiredReads.every((path) => readsBeforeMechanic.includes(path)),
    readsBeforeMechanic.join(', ') || 'none');
  add('exactly one Sonnet/Terra mechanic and no other agents',
    mechanics.length === 1 && spawns.length === 1,
    spawns.map((spawn) => spawn.model).join(', ') || 'none');

  const packet = mechanic?.prompt ?? '';
  add('mechanical packet locks scope, behavior, check, and leaf boundary',
    /src\/service\.js/.test(packet)
      && /test\/service\.test\.js/.test(packet)
      && /test\/server\.test\.js/.test(packet)
      && /examples\/client\.js/.test(packet)
      && /docs\/api\.md/.test(packet)
      && /locked behavior|already approved|exact propagation/i.test(packet)
      && /npm test|node --test/.test(packet)
      && /do not (?:guess|broaden scope|spawn agents)/i.test(packet));
  add('mechanic result collected with successful check evidence',
    mechanicResult != null
      && /\bDONE\b/i.test(mechanicText)
      && !/\bBLOCKED\b|# fail\s+[1-9]|\bfailed\b|\bfailure\b|\bnot ok\b/i.test(mechanicText)
      && /npm test|node --test/i.test(mechanicText)
      && /# pass\s+[1-9]|\b[1-9]\d*\s+(?:tests?\s+)?pass(?:ed)?\b|\bPASS\b/i.test(mechanicText)
      && !/launched successfully|retrieval_status[\s\S]*timeout/i.test(mechanicText));

  const structuredWrites = calls
    .filter((call) => ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(call.name))
    .filter((call) => !relativePath(pathOf(call)).startsWith('.maximum-effort/'));
  const shellWrites = bash.filter((call) => SOURCE_PATH.test(call.command) && BASH_WRITE.test(call.command));
  add('owner does not duplicate a successful mechanical edit',
    structuredWrites.length === 0 && shellWrites.length === 0,
    `${structuredWrites.length} structured · ${shellWrites.length} shell writes`);
  add('no scout or frontier reviewer for a locked non-risky M task',
    reviewers.length === 0 && spawns.length === mechanics.length);

  const diffAfterMechanic = bash.find((call) =>
    /git diff/.test(call.command)
      && call.eventIndex > (mechanicResult?.eventIndex ?? Number.POSITIVE_INFINITY));
  add('owner inspects diff after collecting the mechanic', diffAfterMechanic != null);
  const finalSuite = bash.find((call) =>
    /npm test|node --test/.test(call.command)
      && call.eventIndex > (diffAfterMechanic?.eventIndex ?? Number.POSITIVE_INFINITY));
  const finalSuiteText = finalSuite ? resultText(finalSuite.id) : '';
  add('owner runs a successful final suite after integration',
    finalSuite != null
      && /# pass\s+[1-9]|\b[1-9]\d*\s+(?:tests?\s+)?pass(?:ed)?\b|\bPASS\b/i.test(finalSuiteText)
      && !/# fail\s+[1-9]|\bfailed\b|\bfailure\b|\bnot ok\b/i.test(finalSuiteText));
  add('M task creates no persistent plan', !existsSync(join(workdir, '.maximum-effort/plan.md')));
  add('receipt records one mechanic and no takeover',
    /Route:\s*M\s*·\s*owner\s+(?:opus|fable|sol)[^·]*·\s*scouts\s+[^·]*×0\s*·\s*mechanics\s+(?:sonnet|terra)[^·]*×1\s*·\s*takeovers\s+0\s*·\s*review\s+self/i.test(finalText),
    finalText.match(/Route:[^\n]*/)?.[0]);

  const tests = exec('npm test');
  add('test suite green', tests.ok, tests.ok ? tests.out.match(/# pass \d+/)?.[0] : tests.out.slice(-300));
  const artifactPaths = [
    'src/service.js',
    'test/service.test.js',
    'test/server.test.js',
    'examples/client.js',
    'docs/api.md',
  ];
  const artifacts = artifactPaths.map((path) => [path, readFileSync(join(workdir, path), 'utf8')]);
  add('every named artifact uses only the approved identifier',
    artifacts.every(([, source]) => source.includes('orbit-api') && !source.includes('orbit-core')),
    artifacts.filter(([, source]) => !source.includes('orbit-api') || source.includes('orbit-core')).map(([path]) => path).join(', ') || 'all');
  const serviceTest = readFileSync(join(workdir, 'test/service.test.js'), 'utf8');
  const serverTest = readFileSync(join(workdir, 'test/server.test.js'), 'utf8');
  add('tests assert the new identifier through unit and HTTP seams',
    /assert\.equal\(SERVICE_ID, ['"]orbit-api['"]\)/.test(serviceTest)
      && /assert\.deepEqual\([\s\S]*service:\s*['"]orbit-api['"]/.test(serverTest));
  const probe = await probeHealth(workdir);
  add('live health response proves the identifier and unchanged shape', probe.ok, probe.detail);

  const ledger = join(home, '.maximum-effort/ledger.jsonl');
  const rows = existsSync(ledger)
    ? readFileSync(ledger, 'utf8').split('\n').flatMap((line) => {
      try { return line ? [JSON.parse(line)] : []; } catch { return []; }
    }).filter((row) => row.cwd === workdir)
    : [];
  const keys = ['ts', 'tool', 'cwd', 'task', 'size', 'owner_model', 'owner_effort', 'pool', 'scouts', 'mechanics', 'takeovers', 'review', 'pr_review', 'next_pool', 'outcome', 'rework_rounds'];
  const modelCount = (value, pattern) => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.entries(value).filter(([model]) => pattern.test(model)).reduce((sum, [, count]) => sum + count, 0)
    : -1;
  add('task ledger records typed delegation counts',
    rows.some((row) => keys.every((key) => Object.hasOwn(row, key))
      && modelCount(row.scouts, /haiku|luna/i) === 0
      && modelCount(row.mechanics, /sonnet|terra/i) === 1
      && row.takeovers === 0
      && row.review === 'self'),
    `${rows.length} matching rows`);
  return checks;
}

async function probeHealth(workdir) {
  let server;
  try {
    const moduleUrl = `${pathToFileURL(join(workdir, 'src/server.js')).href}?eval=${Date.now()}`;
    const { createServer } = await import(moduleUrl);
    server = createServer();
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    const health = await fetch(`${base}/health`);
    const missing = await fetch(`${base}/missing`);
    const body = await health.json();
    const ok = health.status === 200
      && missing.status === 404
      && JSON.stringify(body) === JSON.stringify({ ok: true, service: 'orbit-api' });
    return { ok, detail: `health ${health.status} ${JSON.stringify(body)} · missing ${missing.status}` };
  } catch (error) {
    return { ok: false, detail: error.message };
  } finally {
    if (server?.listening) await new Promise((resolve) => server.close(resolve));
  }
}
