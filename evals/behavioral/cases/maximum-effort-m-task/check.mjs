import { readFileSync, existsSync, readdirSync, realpathSync } from 'node:fs';
import { join, relative, isAbsolute } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { homedir } from 'node:os';

// Lane contract for maximum-effort, graded from the coordinator's own tool calls. With
// --verbose stream-json a subagent's calls appear too, tagged parent_tool_use_id — those
// are dropped, so what remains is exactly what the coordinator did itself. Lanes may run
// through the Codex pool (`codex exec -p scout|worker|brain` from Bash); they count as
// lanes with the profile's model.
const PROFILE_MODEL = { scout: 'luna', worker: 'terra', brain: 'sol' };
const LANE_OF_PROFILE = { scout: 'scout', worker: 'worker', brain: 'planner' };
const MID = new Set(['sonnet', 'terra']);
const HOT = new Set(['opus', 'sol']);

export default async function check({ workdir, transcript, exec }) {
  const checks = [];
  const add = (name, pass, detail, required = true) => checks.push({ name, pass, detail, required });

  const events = transcript.split('\n').flatMap((l) => { try { return l ? [JSON.parse(l)] : []; } catch { return []; } });
  const calls = [];
  const texts = [];
  for (const ev of events) {
    if (ev.type !== 'assistant' || ev.parent_tool_use_id) continue;
    for (const block of ev.message?.content ?? []) {
      if (block.type === 'tool_use') calls.push({ name: block.name, input: block.input ?? {}, i: calls.length });
      else if (block.type === 'text') texts.push(block.text);
    }
  }
  const finalText = events.findLast((e) => e.type === 'result')?.result || texts.at(-1) || '';
  const prose = texts.join('\n');
  const planPath = join(workdir, '.maximum-effort/plan.md');
  const plan = existsSync(planPath) ? readFileSync(planPath, 'utf8') : '';

  const spawns = [];
  for (const c of calls) {
    if (c.name === 'Agent' || c.name === 'Task') {
      const type = String(c.input.subagent_type ?? '').toLowerCase();
      const model = String(c.input.model ?? '').toLowerCase() || { scout: 'haiku', worker: 'sonnet', planner: 'fable' }[type] || 'inherit';
      const lane = type === 'planner' || model === 'fable' ? 'planner'
        : type === 'scout' || model === 'haiku' ? 'scout'
        : type === 'worker' || MID.has(model) || HOT.has(model) ? 'worker' : 'other';
      spawns.push({ i: c.i, lane, model, pool: 'claude', boundary: /do not spawn agents/i.test(String(c.input.prompt ?? '')) });
    } else if (c.name === 'Bash') {
      const cmd = String(c.input.command ?? '');
      for (const m of cmd.matchAll(/codex exec\s+([^\n;&|)]*)/g)) {
        const profile = m[1].match(/(?:^|\s)(?:-p|--profile)\s+(\w+)/)?.[1];
        if (!profile) continue;
        const model = (m[1].match(/(?:^|\s)(?:-m|--model)\s+(\S+)/)?.[1] ?? `gpt-5.6-${PROFILE_MODEL[profile] ?? ''}`).replace(/^gpt-5\.6-/, '');
        spawns.push({ i: c.i, lane: LANE_OF_PROFILE[profile] ?? 'other', model, pool: 'codex', boundary: /do not spawn agents/i.test(cmd) });
      }
    }
  }
  const scouts = spawns.filter((s) => s.lane === 'scout');
  const workers = spawns.filter((s) => s.lane === 'worker');
  const planners = spawns.filter((s) => s.lane === 'planner');
  const describe = (xs) => xs.map((s) => `${s.lane}:${s.model}${s.pool === 'codex' ? '@codex' : ''}`).join(', ') || 'none';
  const bashText = calls.filter((c) => c.name === 'Bash').map((c) => String(c.input.command ?? '')).join('\n');
  const boundaryOk = (s) => s.boundary || (s.pool === 'codex' && /do not spawn agents/i.test(bashText));

  add('skill invoked', /maximum-effort/.test(JSON.stringify(calls)) || /Maximum effort — triaging/.test(prose));
  add('brief written (Goal / Done when / Constraints / Risk / Unknowns)',
    /Goal:[\s\S]{0,400}Done when:[\s\S]{0,400}Constraints:[\s\S]{0,400}Risk:[\s\S]{0,400}Unknowns:/.test(prose + '\n' + plan));
  add('≥1 scout, and the first scout runs before the first worker',
    scouts.length >= 1 && workers.length >= 1 && scouts[0].i < workers[0].i, `spawns: ${describe(spawns)}`);
  add('≥1 worker on the mid tier (sonnet / terra)', workers.some((s) => MID.has(s.model)), `workers: ${describe(workers)}`);
  add('the risky (auth) step runs on opus / sol', workers.some((s) => HOT.has(s.model)), `workers: ${describe(workers)}`);
  add('no planner before the first worker on an M task (review after is fine)',
    workers.length > 0 && planners.every((p) => p.i > workers[0].i), `planners: ${describe(planners)}`);
  add('every spawn prompt carries the leaf boundary', spawns.length > 0 && spawns.every(boundaryOk), `${spawns.filter((s) => !boundaryOk(s)).length} without`);
  const backgrounded = calls
    .filter((c) => c.name === 'Bash')
    .map((c) => String(c.input.command ?? ''))
    .filter((cmd) => /codex exec/.test(cmd) && /(\)\s*&(?!&)|[^&]&\s*$)/m.test(cmd));
  const unwaited = backgrounded.filter((cmd) => !/\bwait\b/.test(cmd));
  const deferred = calls.filter((c) => c.name === 'Monitor' || c.name === 'TaskOutput');
  add('lanes awaited in the turn that spawned them', unwaited.length === 0 && deferred.length === 0,
    `${unwaited.length} backgrounded codex exec without wait · ${deferred.length} Monitor/TaskOutput calls`);

  const wd = realpathSync(workdir);
  const rel = (p) => {
    const abs = isAbsolute(p) ? p : join(wd, p);
    let real = abs;
    try { real = realpathSync(abs); } catch { real = abs.replace(/^\/private\//, '/'); }
    return relative(wd, real);
  };
  const allowed = (p) => p.startsWith('.maximum-effort/') || p === '.git/info/exclude';
  const stray = calls
    .filter((c) => ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(c.name))
    .map((c) => rel(String(c.input.file_path ?? c.input.notebook_path ?? '')))
    .filter((p) => !allowed(p));
  add('coordinator edited nothing but .maximum-effort/', stray.length === 0, stray.length ? `edited: ${stray.join(', ')}` : undefined);
  const sourceReads = calls.filter((c) => ['Read', 'Grep', 'Glob'].includes(c.name) && !/\.maximum-effort|SKILL\.md|references\//.test(JSON.stringify(c.input)));
  add('coordinator read no source files itself', sourceReads.length === 0, `${sourceReads.length} top-level source reads`, false);

  const steps = plan.split('\n').filter((l) => /^- \[[ x]\] \d+\./i.test(l));
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
  const ledgerLines = existsSync(ledger) ? readFileSync(ledger, 'utf8').split('\n').filter((l) => l.includes(workdir) || l.includes(wd)) : [];
  add('ledger lines appended for this run', ledgerLines.length > 0, `${ledgerLines.length} lines`, false);

  return checks;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function probeLimit(workdir) {
  const port = await freePort();
  const child = spawn('node', ['src/server.js'], { cwd: workdir, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  let exited = false;
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  child.on('exit', () => { exited = true; });
  const deadline = Date.now() + 8000;
  let started = false;
  while (!started && !exited && Date.now() < deadline) {
    started = await fetch(`http://127.0.0.1:${port}/health`).then((r) => r.ok, () => false);
    if (!started) await new Promise((r) => setTimeout(r, 200));
  }
  try {
    if (!started) return { ok: false, detail: `server did not answer /health on :${port}: ${out.slice(-200)}` };
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
