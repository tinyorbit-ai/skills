import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { GateCheck, GatePhase, GateRun } from '../types'

const phaseAtom = atom({ plugin: 'forge-gate', key: 'phase' } as const, null)
const runsAtom = atom({ plugin: 'forge-gate', key: 'runs' } as const, {})
const checkedAtom = atom({ plugin: 'forge-gate', key: 'checked' } as const, null)
const treeAtom = atom({ plugin: 'forge-gate', key: 'tree' } as const, '')
const runningAtom = atom({ plugin: 'forge-gate', key: 'isRunning' } as const, false)

type Runs = Record<string, GateRun>
type Stored = { runs?: Runs; checked?: GateCheck | null }
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

// The phase whose branch is checked out (or the one /gate pinned), or null
// outside a forge repo.
const locate = async ($: EngineInterface): Promise<GatePhase | null> => {
  if (cwd === '') return null
  const top = await $.process.run(['git', 'rev-parse', '--show-toplevel'], { cwd })
  if (top.exitCode !== 0) return null
  const root = top.stdout.trim()
  let plan: string
  try {
    plan = String(await $.fs.read(`${root}/wiki/plan.md`))
  } catch {
    return null
  }
  const phases = parsePhases(plan)
  let found: ParsedPhase | undefined
  if (pinned !== null) {
    found = phases.find(phase => phase.n === pinned)
  } else {
    const head = await $.process.run(['git', 'branch', '--show-current'], { cwd: root })
    const branch = head.stdout.trim()
    found = branch === '' ? undefined : phases.find(phase => phase.branch === branch)
  }
  if (found === undefined) return null
  const commands: string[] = []
  for (const command of found.candidates) {
    if (await isRunnable($, root, command)) commands.push(command)
  }
  return { n: found.n, title: found.title, branch: found.branch, gate: found.gate, commands, hasProse: found.hasProse, root }
}

// ---------- The working tree ----------

// The git tree id of every working file, untracked ones included, built in a
// throwaway index so the real one is untouched. Content, not commits: the same
// files give the same id before and after a commit, and any edit changes it.
const TREE_SCRIPT = [
  'idx=$(mktemp) || exit 1',
  'cp "$(git rev-parse --git-path index)" "$idx" 2>/dev/null || rm -f "$idx"',
  'GIT_INDEX_FILE="$idx" git add -A >/dev/null 2>&1; GIT_INDEX_FILE="$idx" git write-tree',
  'rm -f "$idx"',
].join('\n')

const treeId = async ($: EngineInterface, root: string): Promise<string> => {
  const { stdout } = await $.process.run(['/bin/sh', '-c', TREE_SCRIPT], { cwd: root })
  return stdout.trim()
}

const storeKey = (phase: GatePhase): string => `gate:${phase.root}:${phase.n}`

const save = async ($: EngineInterface, phase: GatePhase): Promise<void> => {
  const [runs, checked] = await Promise.all([read($, runsAtom), read($, checkedAtom)])
  await $.store.set(storeKey(phase), { runs, checked })
}

const refresh = async ($: EngineInterface): Promise<GatePhase | null> => {
  const phase = await locate($)
  const before = await read($, phaseAtom)
  if (JSON.stringify(before) !== JSON.stringify(phase)) {
    const stored = (phase === null ? undefined : ((await $.store.get(storeKey(phase))) as Stored | undefined)) ?? {}
    await update($, phaseAtom, () => phase)
    await update($, runsAtom, () => stored.runs ?? {})
    await update($, checkedAtom, () => stored.checked ?? null)
  }
  if (phase !== null) {
    const tree = await treeId($, phase.root)
    await update($, treeAtom, () => tree)
  }
  return phase
}

const record = async ($: EngineInterface, phase: GatePhase, runs: readonly GateRun[]): Promise<void> => {
  await update($, runsAtom, all => ({ ...all, ...Object.fromEntries(runs.map(run => [run.command, run])) }))
  await save($, phase)
}

// ---------- Verdicts ----------

const verdictOf = (phase: GatePhase, runs: Runs, checked: GateCheck | null, tree: string): Verdict => {
  if (phase.commands.length === 0) {
    return checked !== null && tree !== '' && checked.tree === tree ? { kind: 'checked' } : { kind: 'manual' }
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

// The gate command a Bash call ran, when its exit code speaks for that command:
// nothing after it may pipe, mask or replace the status.
const gateIn = (bash: string, commands: readonly string[]): string | undefined => {
  const line = squash(bash)
  for (const command of commands) {
    const wanted = squash(command)
    const at = line.indexOf(wanted)
    if (at < 0) continue
    const after = line.slice(at + wanted.length).trim()
    if (after === '' || /^((2>&1|[12]?>\s*\S+)\s*)+$/.test(after) || (after.startsWith('&&') && !/\|\||;/.test(after))) {
      return command
    }
  }
  return undefined
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

  await update($, runningAtom, () => true)
  const done: Omit<GateRun, 'tree'>[] = []
  try {
    for (const command of phase.commands) {
      const started = await $.clock.now()
      try {
        const out = await $.process.run(['/bin/sh', '-c', command], { cwd: phase.root, timeoutMs: RUN_TIMEOUT_MS })
        const at = await $.clock.now()
        done.push({ command, isOk: out.exitCode === 0, exitCode: out.exitCode, at, ms: at - started, tail: tailOf(`${out.stdout}\n${out.stderr}`), by: 'person' })
      } catch (error) {
        const at = await $.clock.now()
        done.push({ command, isOk: false, at, ms: at - started, tail: String(error), by: 'person' })
      }
    }
  } finally {
    await update($, runningAtom, () => false)
  }
  // Fingerprinted after the whole run, so files the gate itself writes do not
  // make its own results stale.
  const tree = await treeId($, phase.root)
  await record($, phase, done.map(run => ({ ...run, tree })))
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
  await update($, checkedAtom, () => ({ at, tree }))
  await save($, phase)
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

const claimsDone = (text: string): boolean => DONE_CLAIMS.some(pattern => pattern.test(text))

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
    const ran = await next(e)
    const phase = await read($, phaseAtom)
    if (phase === null) return ran

    if (e.tool === 'Bash' && e.run_in_background !== true) {
      const command = gateIn(e.command, phase.commands)
      if (command !== undefined) {
        const [tree, at] = await Promise.all([treeId($, phase.root), $.clock.now()])
        const isOk = ran.deny === undefined && ran.isError !== true
        await record($, phase, [{ command, isOk, at, tail: tailOf(ran.text ?? ''), tree, by: 'claude' }])
        await update($, treeAtom, () => tree)
        return ran
      }
      if (ran.isReadOnly !== true) await update($, treeAtom, () => '')
    } else if (EDIT_TOOLS.has(String(e.tool))) {
      await update($, treeAtom, () => '')
    }
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) await refresh($).catch(() => null)
    return next(e)
  })

  on('classic.Stop', async ($, e, next) => {
    const result = await next(e)
    if (!isGuarding || result.block !== undefined || e.stop_hook_active) return result
    if (!claimsDone(e.last_assistant_message ?? '')) return result
    const phase = await refresh($)
    if (phase === null) return result
    const [runs, checked, tree] = await Promise.all([read($, runsAtom), read($, checkedAtom), read($, treeAtom)])
    const verdict = verdictOf(phase, runs, checked, tree)
    if (verdict.kind === 'green' || verdict.kind === 'checked') return result

    const ask =
      verdict.kind === 'manual'
        ? 'Its checks need a person: ask them to check it and press Checked in the gate band. Do not call the phase done before that.'
        : 'Run the gate commands and show their output, fix what fails, or say plainly that the phase is not done yet.'
    return {
      ...result,
      block: `forge-gate: you reported phase ${phase.n} as done, but its Verifiable gate is not green on the current working tree.\n${report(phase, runs, checked, tree)}\n${ask}`,
    }
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
