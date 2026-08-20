import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative, isAbsolute } from 'node:path';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';

// Lane contract for maximum-effort, graded from the transcript's top-level tool calls.
// A subagent's own calls never surface there — which is the point: the coordinator
// must touch nothing but the plan, and every source read must have gone to a scout.
export default async function check({ workdir, transcript, exec }) {
  const checks = [];
  const add = (name, pass, detail, required = true) => checks.push({ name, pass, detail, required });

  const events = transcript.split('\n').flatMap((l) => { try { return l ? [JSON.parse(l)] : []; } catch { return []; } });
  const calls = [];
  const texts = [];
  for (const ev of events) {
    if (ev.type !== 'assistant') continue;
    for (const block of ev.message?.content ?? []) {
      if (block.type === 'tool_use') calls.push({ name: block.name, input: block.input ?? {}, i: calls.length });
      else if (block.type === 'text') texts.push(block.text);
    }
  }
  const finalText = events.findLast((e) => e.type === 'result')?.result || texts.at(-1) || '';
  const prose = texts.join('\n');
  const planPath = join(workdir, '.maximum-effort/plan.md');
  const plan = existsSync(planPath) ? readFileSync(planPath, 'utf8') : '';

  const modelOf = (c) => {
    const explicit = String(c.input.model ?? '').toLowerCase();
    if (explicit) return explicit;
    return { scout: 'haiku', worker: 'sonnet', planner: 'fable' }[String(c.input.subagent_type ?? '').toLowerCase()] ?? 'inherit';
  };
  const laneOf = (c) => {
    const t = String(c.input.subagent_type ?? '').toLowerCase();
    const m = modelOf(c);
    if (t === 'planner' || m === 'fable') return 'planner';
    if (t === 'scout' || m === 'haiku') return 'scout';
    if (t === 'worker' || m === 'sonnet' || m === 'opus') return 'worker';
    return 'other';
  };
  const spawns = calls.filter((c) => c.name === 'Agent' || c.name === 'Task');
  const scouts = spawns.filter((c) => laneOf(c) === 'scout');
  const workers = spawns.filter((c) => laneOf(c) === 'worker');
  const planners = spawns.filter((c) => laneOf(c) === 'planner');
  const describe = (xs) => xs.map((c) => `${laneOf(c)}:${modelOf(c)}`).join(', ') || 'none';
  const boundary = (c) => /do not spawn agents/i.test(String(c.input.prompt ?? ''));

  add('skill invoked', /maximum-effort/.test(JSON.stringify(calls)) || /Maximum effort — triaging/.test(prose));
  add('brief written (Goal / Done when / Constraints / Risk / Unknowns)',
    /Goal:[\s\S]{0,400}Done when:[\s\S]{0,400}Constraints:[\s\S]{0,400}Risk:[\s\S]{0,400}Unknowns:/.test(prose + '\n' + plan));
  add('≥1 scout, and the first scout runs before the first worker',
    scouts.length >= 1 && workers.length >= 1 && scouts[0].i < workers[0].i, `spawns: ${describe(spawns)}`);
  add('≥1 worker on sonnet', workers.some((c) => modelOf(c) === 'sonnet'), `workers: ${describe(workers)}`);
  add('the risky (auth) step runs on opus', workers.some((c) => modelOf(c) === 'opus'), `workers: ${describe(workers)}`);
  add('no planner / fable on an M task', planners.length === 0 && spawns.every((c) => modelOf(c) !== 'fable'), `planners: ${describe(planners)}`);
  add('every spawn prompt carries the leaf boundary', spawns.length > 0 && spawns.every(boundary), `${spawns.filter((c) => !boundary(c)).length} without`);

  const rel = (p) => (isAbsolute(p) ? relative(workdir, p) : p);
  const allowed = (p) => p.startsWith('.maximum-effort/') || p === '.git/info/exclude';
  const stray = calls
    .filter((c) => ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(c.name))
    .map((c) => rel(String(c.input.file_path ?? c.input.notebook_path ?? '')))
    .filter((p) => !allowed(p));
  add('coordinator edited nothing but .maximum-effort/', stray.length === 0, stray.length ? `edited: ${stray.join(', ')}` : undefined);
  const sourceReads = calls.filter((c) => ['Read', 'Grep', 'Glob'].includes(c.name) && !/\.maximum-effort|SKILL\.md|references\//.test(JSON.stringify(c.input)));
  add('coordinator read no source files itself', sourceReads.length === 0, `${sourceReads.length} top-level source reads`, false);

  const steps = plan.split('\n').filter((l) => /^- \[[ x]\] \d+\./.test(l));
  add('plan file with ≥2 steps, each with a check', steps.length >= 2 && steps.every((l) => /check:/.test(l)), `${steps.length} steps`);
  add('plan marks the login-route step risky', steps.some((l) => /risky:\s*yes/i.test(l)));
  add('every step ticked', steps.length > 0 && steps.every((l) => /^- \[x\]/i.test(l)), `${steps.filter((l) => /^- \[ \]/.test(l)).length} open`);
  const exclude = existsSync(join(workdir, '.git/info/exclude')) ? readFileSync(join(workdir, '.git/info/exclude'), 'utf8') : '';
  const gitignore = existsSync(join(workdir, '.gitignore')) ? readFileSync(join(workdir, '.gitignore'), 'utf8') : '';
  add('.maximum-effort/ excluded via .git/info/exclude, not .gitignore', /\.maximum-effort/.test(exclude) && !/\.maximum-effort/.test(gitignore));
  add('receipt line in the final message', /Route:\s*[SML]\s*·/.test(finalText), finalText.match(/Route:[^\n]*/)?.[0]);

  const tests = exec('npm test');
  add('test suite green (existing + new)', tests.ok, tests.ok ? tests.out.match(/# pass \d+/)?.[0] : tests.out.slice(-300));
  const testDir = join(workdir, 'test');
  const testSrc = existsSync(testDir) ? readdirSync(testDir).map((f) => readFileSync(join(testDir, f), 'utf8')).join('\n') : '';
  add('a test covers the 429', /429/.test(testSrc));
  const probe = await probeLimit(workdir);
  add('limit enforced at runtime (6th login from one IP → 429 + Retry-After)', probe.ok, probe.detail);

  const ledger = join(homedir(), '.maximum-effort/ledger.jsonl');
  const ledgerLines = existsSync(ledger) ? readFileSync(ledger, 'utf8').split('\n').filter((l) => l.includes(workdir)) : [];
  add('ledger lines appended for this run', ledgerLines.length > 0, `${ledgerLines.length} lines`, false);

  return checks;
}

async function probeLimit(workdir) {
  const child = spawn('node', ['src/server.js'], { cwd: workdir, env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  const port = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 8000);
    const onData = (d) => {
      out += d;
      const m = out.match(/listening on (\d+)/);
      if (m) { clearTimeout(timer); resolve(Number(m[1])); }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', (d) => { out += d; });
    child.on('exit', () => { clearTimeout(timer); resolve(null); });
  });
  try {
    if (!port) return { ok: false, detail: `server did not start: ${out.slice(-200)}` };
    const statuses = [];
    let retryAfter = null;
    for (let i = 0; i < 6; i++) {
      const res = await fetch(`http://127.0.0.1:${port}/login`, { method: 'POST', body: JSON.stringify({ username: 'ada', password: 'nope' }) });
      statuses.push(res.status);
      if (i === 5) retryAfter = res.headers.get('retry-after');
    }
    const ok = statuses.slice(0, 5).every((s) => s === 401) && statuses[5] === 429 && retryAfter !== null;
    return { ok, detail: `statuses ${statuses.join(',')} · retry-after ${retryAfter ?? 'missing'}` };
  } catch (e) {
    return { ok: false, detail: e.message };
  } finally {
    child.kill();
  }
}
