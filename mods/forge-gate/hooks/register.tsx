import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { GateCheck, GatePhase, GateRun } from '../types'

const phaseAtom = atom({ plugin: 'forge-gate', key: 'phase' } as const, null)
const runsAtom = atom({ plugin: 'forge-gate', key: 'runs' } as const, {})
const checkedAtom = atom({ plugin: 'forge-gate', key: 'checked' } as const, null)
const treeAtom = atom({ plugin: 'forge-gate', key: 'tree' } as const, '')
const runningAtom = atom({ plugin: 'forge-gate', key: 'isRunning' } as const, false)

type Runs = Record<string, GateRun>
type ParsedPhase = { n: number; title: string; branch: string; gate: string; candidates: string[]; hasProse: boolean }
type Verdict =
  | { kind: 'green' }
  | { kind: 'red'; failing: GateRun[] }
  | { kind: 'unrun'; missing: string[] }
  | { kind: 'manual' }
  | { kind: 'checked' }

const RUN_TIMEOUT_MS = 600_000
const TAIL_CHARS = 600

// ---------- Reading the plan ----------

const PHASE_HEAD = /^## Phase (\d+)\s*[—–-]\s*(.+)$/gm

// Tools that run checks; anything else must be found on PATH before it counts.
const RUNNERS = new Set([
  'bun', 'bunx', 'npm', 'npx', 'pnpm', 'yarn', 'node', 'deno', 'go', 'cargo', 'make', 'just',
  'python', 'python3', 'uv', 'pytest', 'swift', 'xcodebuild', 'xcrun', 'ruby', 'bundle', 'rake',
  'mix', 'gradle', 'mvn', 'dotnet', 'php', 'composer', 'sh', 'bash', 'zsh', 'git', 'curl',
  'docker', 'tsc', 'vitest', 'jest', 'playwright', 'sqlite3', 'jq', 'grep', 'rg', 'test',
  'echo', 'cat', 'ls', 'diff', 'cmp', 'wc', 'timeout', 'env',
])
// Never run unattended: these change the world rather than check it.
const NEVER = /\b(prod|production|deploy|release|publish|send|push|install|uninstall|rm|drop|delete|truncate|migrate|rollback|destroy|apply)\b/i
// Never end on their own.
const ENDLESS = new Set(['yes', 'watch', 'top', 'htop', 'less', 'more', 'vi', 'vim', 'nano', 'open'])
// Words a commands-only gate uses around its commands; more than a few others means
// the gate also asks for checks a command cannot prove.
const GLUE = new Set(['exits', 'exit', 'and', 'prints', 'print', 'green', 'passes', 'pass', 'the', 'with', 'output', 'returns', 'shows', 'then', 'both', 'all'])

const firstToken = (command: string): string =>
  command.split(/\s+/).find(token => !/^[A-Z_][A-Z0-9_]*=/.test(token)) ?? ''

const isCandidate = (span: string): boolean => {
  if (!/\s/.test(span) || /<[^>]+>/.test(span) || span.includes('…') || span.startsWith('...')) return false
  const token = firstToken(span)
  return /^[\w./~-]+$/.test(token) && !ENDLESS.has(token) && !NEVER.test(span)
}

const gateText = (body: string): string => {
  const at = body.indexOf('**Verifiable gate:**')
  if (at < 0) return ''
  const rest = body.slice(at + '**Verifiable gate:**'.length)
  const next = rest.search(/^\*\*[A-Z][\w ]*:\*\*/m)
  return (next < 0 ? rest : rest.slice(0, next)).trim()
}

const parsePhases = (plan: string): ParsedPhase[] => {
  const heads = [...plan.matchAll(PHASE_HEAD)]
  return heads.map((head, i) => {
    const start = (head.index ?? 0) + head[0].length
    const end = heads[i + 1]?.index ?? plan.length
    const body = plan.slice(start, end).split(/^## /m)[0] ?? ''
    const gate = gateText(body)
    const candidates: string[] = []
    for (const match of gate.matchAll(/`([^`\n]+)`/g)) {
      const span = (match[1] ?? '').trim()
      if (isCandidate(span) && !candidates.includes(span)) candidates.push(span)
    }
    const words = (gate.replace(/`[^`]*`/g, ' ').replace(/"[^"]*"/g, ' ').match(/[A-Za-z]{3,}/g) ?? [])
      .filter(word => !GLUE.has(word.toLowerCase()))
    return {
      n: Number(head[1]),
      title: (head[2] ?? '').trim(),
      branch: /\*\*Branch:\*\*\s*`([^`]+)`/.exec(body)?.[1] ?? '',
      gate,
      candidates,
      hasProse: words.length >= 6,
    }
  })
}

const onPath = new Map<string, boolean>()

const isRunnable = async ($: EngineInterface, root: string, command: string): Promise<boolean> => {
  const token = firstToken(command)
  if (RUNNERS.has(token) || token.startsWith('./')) return true
  const known = onPath.get(token)
  if (known !== undefined) return known
  const found = await $.process.run(['/bin/sh', '-c', 'command -v "$1" >/dev/null', 'sh', token], { cwd: root })
  onPath.set(token, found.exitCode === 0)
  return found.exitCode === 0
}

let cwd = ''
let pinned: number | null = null

// The directory the main loop's Bash runs in now; it can move during a session.
const sessionDir = async ($: EngineInterface): Promise<string> => {
  const dir = await $.session.cwd().catch(() => cwd)
  return dir === '' ? cwd : dir
}

const roots = new Map<string, string | null>()

const rootOf = async ($: EngineInterface, dir: string): Promise<string | null> => {
  if (dir === '') return null
  const known = roots.get(dir)
  if (known !== undefined) return known
  const top = await $.process.run(['git', 'rev-parse', '--show-toplevel'], { cwd: dir })
  const root = top.exitCode === 0 ? top.stdout.trim() : null
  // "No repo" isn't cached: `git init` can come later in the session.
  if (root !== null) roots.set(dir, root)
  return root
}

const readPlan = async ($: EngineInterface, root: string): Promise<string | null> => {
  try {
    return String(await $.fs.read(`${root}/wiki/plan.md`))
  } catch {
    return null
  }
}

const runnableOf = async ($: EngineInterface, root: string, candidates: readonly string[]): Promise<string[]> => {
  const commands: string[] = []
  for (const command of candidates) {
    if (!commands.includes(command) && (await isRunnable($, root, command))) commands.push(command)
  }
  return commands
}

// The phase numbered `number`, else the one whose branch is checked out in `dir`;
// null outside a forge repo.
const locate = async ($: EngineInterface, dir: string, number: number | null): Promise<GatePhase | null> => {
  const root = await rootOf($, dir)
  if (root === null) return null
  const plan = await readPlan($, root)
  if (plan === null) return null
  const phases = parsePhases(plan)
  let found: ParsedPhase | undefined
  if (number !== null) {
    found = phases.find(phase => phase.n === number)
  } else {
    const head = await $.process.run(['git', 'branch', '--show-current'], { cwd: root })
    const branch = head.stdout.trim()
    found = branch === '' ? undefined : phases.find(phase => phase.branch === branch)
  }
  if (found === undefined) return null
  const commands = await runnableOf($, root, found.candidates)
  return { n: found.n, title: found.title, branch: found.branch, gate: found.gate, commands, hasProse: found.hasProse, root }
}

let planCache: { root: string; mtimeMs: number; commands: string[] } | null = null

// Every runnable gate command in the repo's plan, whichever branch is out: a run
// counts before the branch matches (forge-build switches to its branch mid-turn,
// Arnold works on its own branches).
const planCommands = async ($: EngineInterface, root: string): Promise<string[]> => {
  let mtimeMs: number
  try {
    mtimeMs = (await $.fs.stat(`${root}/wiki/plan.md`)).mtimeMs
  } catch {
    return []
  }
  if (planCache !== null && planCache.root === root && planCache.mtimeMs === mtimeMs) return planCache.commands
  const plan = (await readPlan($, root)) ?? ''
  const commands = await runnableOf($, root, parsePhases(plan).flatMap(phase => phase.candidates))
  planCache = { root, mtimeMs, commands }
  return commands
}

// ---------- The working tree ----------

// The git tree id of every working file, untracked ones included, built in a
// throwaway index so the real one is untouched. Content, not commits: the same
// files give the same id before and after a commit, and any edit changes it.
// wiki/ is left out: forge writes its build log and learnings after the gate runs.
const TREE_SCRIPT = [
  'idx=$(mktemp) || exit 1',
  'cp "$(git rev-parse --git-path index)" "$idx" 2>/dev/null || rm -f "$idx"',
  'GIT_INDEX_FILE="$idx" git add -A >/dev/null 2>&1 &&',
  'GIT_INDEX_FILE="$idx" git rm -r -q --cached --ignore-unmatch -- wiki >/dev/null 2>&1 &&',
  'GIT_INDEX_FILE="$idx" git write-tree',
  'status=$?',
  'rm -f "$idx"',
  'exit $status',
].join('\n')

// '' when git fails: an unknown tree is never green.
const treeId = async ($: EngineInterface, root: string): Promise<string> => {
  const out = await $.process.run(['/bin/sh', '-c', TREE_SCRIPT], { cwd: root })
  return out.exitCode === 0 ? out.stdout.trim() : ''
}

// Runs are kept per repo and command, so they don't depend on which phase is out.
const runsKey = (root: string): string => `gate-runs:${root}`
const checkedKey = (root: string, n: number): string => `gate-checked:${root}:${n}`

// The repo whose runs the state holds.
let loadedRoot = ''

const adopt = async ($: EngineInterface, root: string): Promise<void> => {
  if (root === loadedRoot) return
  loadedRoot = root
  const runs = ((await $.store.get(runsKey(root))) as Runs | undefined) ?? {}
  await update($, runsAtom, () => runs)
}

const runsFor = async ($: EngineInterface, root: string): Promise<Runs> =>
  root === loadedRoot ? read($, runsAtom) : (((await $.store.get(runsKey(root))) as Runs | undefined) ?? {})

const recordRuns = async ($: EngineInterface, root: string, runs: readonly GateRun[]): Promise<void> => {
  await adopt($, root)
  await update($, runsAtom, all => ({ ...all, ...Object.fromEntries(runs.map(run => [run.command, run])) }))
  await $.store.set(runsKey(root), await read($, runsAtom))
}

const refresh = async ($: EngineInterface): Promise<GatePhase | null> => {
  const dir = await sessionDir($)
  const root = await rootOf($, dir)
  if (root !== null) await adopt($, root)
  const phase = root === null ? null : await locate($, dir, pinned)
  const before = await read($, phaseAtom)
  if (JSON.stringify(before) !== JSON.stringify(phase)) {
    const checked = phase === null ? null : (((await $.store.get(checkedKey(phase.root, phase.n))) as GateCheck | undefined) ?? null)
    await update($, phaseAtom, () => phase)
    await update($, checkedAtom, () => checked)
  }
  if (root !== null) {
    const tree = await treeId($, root)
    await update($, treeAtom, () => tree)
  }
  return phase
}

// ---------- Verdicts ----------

const verdictOf = (phase: GatePhase, runs: Runs, checked: GateCheck | null, tree: string): Verdict => {
  if (phase.commands.length === 0) {
    const isCurrent = checked !== null && tree !== '' && checked.tree === tree && checked.gate === phase.gate
    return isCurrent ? { kind: 'checked' } : { kind: 'manual' }
  }
  const current = phase.commands
    .map(command => runs[command])
    .filter((run): run is GateRun => run !== undefined && tree !== '' && run.tree === tree)
  const failing = current.filter(run => !run.isOk)
  if (failing.length > 0) return { kind: 'red', failing }
  const missing = phase.commands.filter(command => !current.some(run => run.command === command))
  return missing.length > 0 ? { kind: 'unrun', missing } : { kind: 'green' }
}

const tailOf = (text: string): string => {
  const trimmed = text.trimEnd()
  return trimmed.length > TAIL_CHARS ? `…${trimmed.slice(-TAIL_CHARS)}` : trimmed
}

const excerpt = (text: string, max = 240): string => {
  const line = text.replace(/\s+/g, ' ').trim()
  return line.length > max ? `${line.slice(0, max - 1)}…` : line
}

const ago = (ms: number): string => {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`
}

const squash = (text: string): string => text.replace(/\s+/g, ' ').trim()

const unquote = (word: string): string => word.replace(/^(['"])(.*)\1$/, '$2')

const resolveDir = (dir: string, path: string): string => {
  if (path.startsWith('/')) return path.replace(/\/+$/, '') || '/'
  if (dir === '' || path === '' || path.startsWith('~') || path === '-') return ''
  const parts = dir.split('/')
  for (const part of path.split('/')) {
    if (part === '..') parts.pop()
    else if (part !== '.' && part !== '') parts.push(part)
  }
  return parts.join('/') || '/'
}

// Shell operators between commands. `2>&1` and `&>` are redirects, not operators.
const OPERATOR = /(\s*(?:&&|\|\||;|\||(?<![<>&])&(?![&>])|\n)\s*)/
const REDIRECT = /\s+(?:\d?>>?|&>>?|\d?<)\s*(?:&\d|[^\s|;&]+)/g

// A segment as the command it runs: redirects, leading env assignments and a
// `timeout <n>` wrapper removed.
const commandOf = (segment: string): string =>
  squash(segment.replace(REDIRECT, '')).replace(/^(?:[A-Za-z_]\w*=\S*\s+)*(?:timeout\s+\S+\s+)?/, '')

// A failure is pinned on a gate command only when it is `isAlone`: last in the call,
// with nothing but `cd` before it, so nothing else can have failed first.
type GateHit = { command: string; isAlone: boolean }

const partsOf = (bash: string): string[] => bash.trim().split(OPERATOR).map((part, k) => (k % 2 === 0 ? commandOf(part) : part.trim()))

// The gate commands a Bash call really ran in the repo root, and whose exit code
// the call's own status speaks for. A gate command (which may hold its own pipe)
// must match whole segments; only `&&` or `;` may come before it (after `||`, `|` or
// `&` it may not run, or not decide the status), and only `&&` after it. `base` is
// the shell's directory, '' when unknown: then only an explicit `cd <root> &&` places it.
const gateRunsIn = (bash: string, base: string, root: string, commands: readonly string[]): GateHit[] => {
  const parts = partsOf(bash)
  const wanted = commands.map(command => ({ command, parts: partsOf(command) }))
  const hits: GateHit[] = []
  let dir = base
  let hasRunOther = false
  for (let i = 0; i < parts.length; i += 2) {
    const before = i === 0 ? '' : (parts[i - 1] ?? '')
    if (before !== '' && before !== '&&' && before !== ';') break
    const words = (parts[i] ?? '').split(/\s+/)
    if (words[0] === 'cd') {
      dir = resolveDir(dir, unquote(words[1] ?? ''))
      continue
    }
    const match = wanted.find(gate => gate.parts.every((part, k) => parts[i + k] === part))
    if (match !== undefined && dir === root) {
      const end = i + match.parts.length
      const after = parts.slice(end).filter((_, k) => k % 2 === 0)
      if (after.every(op => op === '&&')) hits.push({ command: match.command, isAlone: after.length === 0 && !hasRunOther })
    }
    hasRunOther = true
  }
  return hits
}

const VERDICT_WORD: Record<Verdict['kind'], string> = {
  green: 'green',
  red: 'red',
  unrun: 'not green',
  manual: 'written checks only, not checked',
  checked: 'checked by the person',
}

const report = (phase: GatePhase, runs: Runs, checked: GateCheck | null, tree: string): string => {
  const verdict = verdictOf(phase, runs, checked, tree)
  const lines = [`Phase ${phase.n} — ${phase.title}: gate ${VERDICT_WORD[verdict.kind]} on this tree.`]
  for (const command of phase.commands) {
    const run = runs[command]
    if (run === undefined) lines.push(`· \`${command}\` has not run.`)
    else if (tree === '' || run.tree !== tree) lines.push(`· \`${command}\` has not run since the last change.`)
    else if (run.isOk) lines.push(`✓ \`${command}\` passed${run.exitCode !== undefined ? ` (exit ${run.exitCode})` : ''}.`)
    else lines.push(`✗ \`${command}\` failed${run.exitCode !== undefined ? ` (exit ${run.exitCode})` : ''}: ${excerpt(run.tail, 300)}`)
  }
  if (phase.commands.length === 0) lines.push(`The gate has no command to run. Its checks: ${excerpt(phase.gate)}`)
  else if (phase.hasProse) lines.push(`The gate also asks for checks no command proves: ${excerpt(phase.gate)}`)
  return lines.join('\n')
}

// ---------- Running the gate ----------

const approved = new Set<string>()

const runGate = async ($: EngineInterface): Promise<string> => {
  const phase = await refresh($)
  if (phase === null) {
    return 'forge-gate: no forge phase here. Check out a phase branch named in wiki/plan.md, or pin one with /gate <n>.'
  }
  if (phase.commands.length === 0) {
    const [checked, tree] = await Promise.all([read($, checkedAtom), read($, treeAtom)])
    return report(phase, {}, checked, tree)
  }
  const key = `${phase.root}\n${phase.commands.join('\n')}`
  if (!approved.has(key)) {
    // Rejects when the person dismisses it, and under -p where nobody can answer.
    const answer = await $.ui
      .ask(`Run phase ${phase.n}'s gate in ${phase.root}?\n${phase.commands.map(command => `  ${command}`).join('\n')}`, [
        'Run',
        'Cancel',
      ])
      .catch(() => 'Cancel')
    if (answer !== 'Run') return 'forge-gate: gate not run.'
    approved.add(key)
  }

  // Pinned to the files the commands saw: an edit made while they run is not credited.
  const before = await treeId($, phase.root)
  await update($, runningAtom, () => true)
  const done: GateRun[] = []
  try {
    for (const command of phase.commands) {
      const started = await $.clock.now()
      try {
        const out = await $.process.run(['/bin/sh', '-c', command], { cwd: phase.root, timeoutMs: RUN_TIMEOUT_MS })
        const at = await $.clock.now()
        done.push({ command, isOk: out.exitCode === 0, exitCode: out.exitCode, at, ms: at - started, tail: tailOf(`${out.stdout}\n${out.stderr}`), tree: before, by: 'person' })
      } catch (error) {
        const at = await $.clock.now()
        done.push({ command, isOk: false, at, ms: at - started, tail: String(error), tree: before, by: 'person' })
      }
    }
  } finally {
    await update($, runningAtom, () => false)
  }
  await recordRuns($, phase.root, done)
  const tree = await treeId($, phase.root)
  await update($, treeAtom, () => tree)
  const [runs, checked] = await Promise.all([read($, runsAtom), read($, checkedAtom)])
  return report(phase, runs, checked, tree)
}

// A press of the band's Run gate: the result's first line as a toast.
const announce = async ($: EngineInterface): Promise<void> => {
  const text = await runGate($)
  $.ui.toast(text.split('\n')[0] ?? '')
}

const markChecked = async ($: EngineInterface): Promise<void> => {
  const phase = await read($, phaseAtom)
  if (phase === null) return
  const [tree, at] = await Promise.all([treeId($, phase.root), $.clock.now()])
  await update($, treeAtom, () => tree)
  await update($, checkedAtom, () => ({ at, tree, gate: phase.gate }))
  await $.store.set(checkedKey(phase.root, phase.n), { at, tree, gate: phase.gate })
}

// ---------- Hooks ----------

// Phrases that report a phase as finished. The guard acts only on these, so a
// turn that pauses to ask something is never sent back.
const DONE_CLAIMS = [
  /\bphase\s*\d*\s*(is\s+)?(now\s+)?(done|complete|completed|finished|built|ready)\b/i,
  /\b(built|finished|completed|implemented)\s+(the\s+)?phase\s*\d+/i,
  /\b(ready|good)\s+to\s+(ship|merge|land)\b/i,
  /\bready\s+for\s+(review|ship|merge|forge-review|forge-ship)\b/i,
  /\bgate\s+(is\s+)?(green|passes|passed|passing|met|satisfied|holds)\b/i,
  /\bhand(ing)?[\s-]?off\s+to\s+forge-(review|ship)\b/i,
  /\ball\s+(checks|tests|gates?)\s+(pass|passed|passing|are\s+green|green)\b/i,
]

// A claim stated as a sentence, not asked: "Is this ready for review?" waits for the
// person, while "Phase 2 is done. Want me to ship it?" still reports done.
const claimsDone = (text: string): boolean =>
  text
    .split(/(?<=[.!?])\s+|\n+/)
    .some(sentence => !sentence.trim().endsWith('?') && DONE_CLAIMS.some(pattern => pattern.test(sentence)))

type ForgeResult = { skill?: unknown; status?: unknown; phase?: unknown; gate?: unknown }

// The FORGE_RESULT line every forge stage ends with (forge/references/headless.md).
// When a message has several, the last one counts.
const forgeResultIn = (text: string): ForgeResult | undefined => {
  const lines = [...text.matchAll(/^FORGE_RESULT[ \t]+(\{.*\})[ \t]*$/gm)]
  const json = lines[lines.length - 1]?.[1]
  if (json === undefined) return undefined
  try {
    const parsed: unknown = JSON.parse(json)
    return typeof parsed === 'object' && parsed !== null ? (parsed as ForgeResult) : undefined
  } catch {
    return undefined
  }
}

// Checks a result line's "gate":"green" against what actually ran on the current
// files. The phase is the one the line names, so forge-ship's claim is still checked
// after it lands on the base branch. Undefined when there is nothing to hold: no
// green claim, no such phase, or a gate that no command proves.
const claimReason = async ($: EngineInterface, dir: string, result: ForgeResult): Promise<string | undefined> => {
  if (result.status !== 'done' || result.gate !== 'green') return undefined
  const current = await read($, phaseAtom)
  const n = typeof result.phase === 'number' ? result.phase : (current?.n ?? null)
  if (n === null) return undefined
  const phase = await locate($, dir, n)
  if (phase === null || phase.commands.length === 0) return undefined
  const runs = await runsFor($, phase.root)
  const tree = await treeId($, phase.root)
  if (verdictOf(phase, runs, null, tree).kind === 'green') return undefined
  const whose = typeof result.skill === 'string' ? `${result.skill}'s` : 'your'
  return [
    `forge-gate: ${whose} FORGE_RESULT says phase ${n}'s gate is green, but it is not green on the current files.`,
    report(phase, runs, null, tree),
    'Run each gate command exactly as written, from the repo root, with nothing piped after it (no `| tail`), so its exit code counts. Then end with the result line again. If it will not go green, set "gate" to "red" (or "deferred" when it cannot run here) and say why in "notes".',
  ].join('\n')
}

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])

export const register: Register = (on, options) => {
  const isGuarding = options['guardDoneClaims'] !== false

  on('session.start', async ($, e, next) => {
    cwd = e.cwd
    await $.command.register({
      name: 'gate',
      description: "Run the forge phase's Verifiable gate (/gate status, /gate <n> to pin a phase, /gate auto)",
    })
    await refresh($).catch(() => null)
    return next(e)
  })

  on('command.run', { command: 'gate' }, async ($, e) => {
    const arg = e.args.trim()
    if (/^\d+$/.test(arg) || arg === 'auto' || arg === 'status') {
      if (arg === 'auto') pinned = null
      else if (arg !== 'status') pinned = Number(arg)
      const phase = await refresh($)
      if (phase === null) return { text: 'forge-gate: no forge phase matches. Check the branch or the phase number in wiki/plan.md.' }
      const [runs, checked, tree] = await Promise.all([read($, runsAtom), read($, checkedAtom), read($, treeAtom)])
      return { text: `${report(phase, runs, checked, tree)}\nCommands: ${phase.commands.length === 0 ? 'none' : phase.commands.map(c => `\`${c}\``).join(', ')}` }
    }
    return { text: await runGate($) }
  })

  on('tool.call', async ($, e, next) => {
    if (e.tool !== 'Bash') {
      const ran = await next(e)
      if (EDIT_TOOLS.has(String(e.tool))) await update($, treeAtom, () => '')
      return ran
    }

    // A subagent's shell directory is unknown, so only an explicit `cd <root> &&` counts.
    const base = e.agentId === undefined ? await sessionDir($) : ''
    const root = await rootOf($, base === '' ? await sessionDir($) : base)
    const hits = root === null || e.run_in_background === true ? [] : gateRunsIn(e.command, base, root, await planCommands($, root))
    if (root === null || hits.length === 0) {
      const ran = await next(e)
      if (ran.isReadOnly !== true) await update($, treeAtom, () => '')
      return ran
    }

    // Pinned to the files the command saw: an edit made while it runs is not credited.
    const before = await treeId($, root)
    const ran = await next(e)
    const output = ran.deny === undefined && ran.isError !== true ? ran.result : undefined
    // Bash moves a long command to the background on a timeout or Ctrl+B: no exit code yet.
    const isUnfinished = output !== undefined && (output.backgroundTaskId !== undefined || output.interrupted)
    // Recorded even when the fingerprint failed: a run on an unknown tree ('') is
    // never green, and it replaces any older pass for the same command.
    if (ran.deny === undefined && !isUnfinished) {
      const isOk = ran.isError !== true
      const at = await $.clock.now()
      const runs = hits
        .filter(hit => isOk || hit.isAlone)
        .map(hit => ({ command: hit.command, isOk, at, tail: tailOf(ran.text ?? ''), tree: before, by: 'claude' as const }))
      await recordRuns($, root, runs)
    }
    const tree = await treeId($, root)
    await update($, treeAtom, () => tree)
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) await refresh($).catch(() => null)
    return next(e)
  })

  on('classic.Stop', async ($, e, next) => {
    const result = await next(e)
    if (!isGuarding || result.block !== undefined || e.stop_hook_active) return result
    const text = e.last_assistant_message ?? ''
    // A forge stage's result line is the exact claim: check it, and skip the phrases.
    const forgeResult = forgeResultIn(text)
    if (forgeResult !== undefined) {
      const reason = await claimReason($, e.cwd || cwd, forgeResult)
      return reason === undefined ? result : { ...result, block: reason }
    }
    if (!claimsDone(text)) return result
    const phase = await refresh($)
    if (phase === null) return result
    const [runs, checked, tree] = await Promise.all([read($, runsAtom), read($, checkedAtom), read($, treeAtom)])
    const verdict = verdictOf(phase, runs, checked, tree)
    if (verdict.kind === 'green' || verdict.kind === 'checked') return result

    const ask =
      verdict.kind === 'manual'
        ? 'Its checks need a person: ask them to check it and press Checked in the gate band. Do not call the phase done before that.'
        : 'Run each gate command exactly as written, from the repo root, with nothing piped after it (no `| tail`), so its exit code counts. Fix what fails, or say plainly that the phase is not done yet.'
    return {
      ...result,
      block: `forge-gate: you reported phase ${phase.n} as done, but its Verifiable gate is not green on the current working tree.\n${report(phase, runs, checked, tree)}\n${ask}`,
    }
  })

  // A forge stage run as a subagent ends with its result line too.
  on('classic.SubagentStop', async ($, e, next) => {
    const result = await next(e)
    if (!isGuarding || result.block !== undefined || e.stop_hook_active) return result
    const forgeResult = forgeResultIn(e.last_assistant_message ?? '')
    if (forgeResult === undefined) return result
    const reason = await claimReason($, e.cwd || cwd, forgeResult)
    return reason === undefined ? result : { ...result, block: reason }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const phase = await read($, phaseAtom)
    if (phase === null || e.props.hasSurvey) return next(e)

    const [runs, checked, tree, isRunning, at] = await Promise.all([
      read($, runsAtom),
      read($, checkedAtom),
      read($, treeAtom),
      read($, runningAtom),
      $.clock.now(),
    ])
    const verdict = verdictOf(phase, runs, checked, tree)
    const latest = Math.max(0, ...Object.values(runs).map(run => run.at))
    const { Box, Text, Button } = $.ui.resolve(e)

    const state = isRunning
      ? { color: 'cyan', word: '… running the gate' }
      : verdict.kind === 'green'
        ? { color: 'green', word: `✓ gate green ${ago(at - latest)} ago` }
        : verdict.kind === 'checked'
          ? { color: 'green', word: '✓ checked by you' }
          : verdict.kind === 'red'
            ? { color: 'red', word: `✗ gate red: ${verdict.failing.map(run => run.command).join(', ')}` }
            : verdict.kind === 'manual'
              ? { color: 'yellow', word: '◐ written checks, not checked' }
              : {
                  color: 'yellow',
                  word:
                    tree === '' && latest > 0
                      ? '◐ changed since the last run'
                      : `◐ ${verdict.kind === 'unrun' ? verdict.missing.length : phase.commands.length} of ${phase.commands.length} not run on this tree`,
                }

    const below = await next(e)
    return (
      <Box flexDirection="column">
        <Box key="forge-gate" flexDirection="row" gap={1} width={e.props.bodyColumns}>
          <Text dimColor wrap="truncate-end">
            Phase {phase.n} · {phase.title}
          </Text>
          <Text color={state.color} wrap="truncate-end">
            {state.word}
          </Text>
          {phase.hasProse && phase.commands.length > 0 && <Text dimColor>+ written checks</Text>}
          {!isRunning && phase.commands.length > 0 && (
            <Button key="run-gate" label="Run gate" onPress={() => void announce($)} />
          )}
          {phase.commands.length === 0 && verdict.kind !== 'checked' && (
            <Button key="mark-checked" label="Checked" onPress={() => void markChecked($)} />
          )}
        </Box>
        {below}
      </Box>
    )
  })
}
