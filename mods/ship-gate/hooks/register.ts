import type { EngineInterface, Register } from 'claude-code'

// Content fingerprints: git tree ids of the working files, so the same files
// give the same id before and after a commit. `tracked` leaves out untracked
// files (stray notes never committed), `all` includes them (new files that were).
type Trees = { tracked: string; all: string }
type CheckRun = Trees & { command: string; isOk: boolean; at: number }
type LizardRun = Trees & { event: string; at: number }
type Evidence = { checks: CheckRun[]; lizard: LizardRun[] }
type Segment = { text: string; dir: string; after: string }
type Ship = { kind: 'push' | 'pr'; dir: string; args: string[]; label: string }

const CHECKS_KEPT = 40
const LIZARD_KEPT = 10
const ALLOW_MS = 10 * 60_000
const VERDICTS = new Set(['APPROVE', 'COMMENT', 'REQUEST_CHANGES'])

// Commands that check the code: tests, typecheck, lint, the repo's own check script.
const CHECK =
  /(^|\s)((bun|deno)\s+test\b|(npm|pnpm|yarn|bun)\s+(run\s+)?(test|check|verify|ci|typecheck|lint)(:\S+)?\b|go\s+(test|vet)\b|cargo\s+(test|check|clippy)\b|pytest\b|python3?\s+-m\s+pytest\b|swift\s+test\b|xcodebuild\b.*\btest\b|make\s+(test|check)\b|node\s+--test\b|(npx\s+|bunx\s+)?(vitest|jest)\b|(npx\s+|bunx\s+)?tsc\s+(--noEmit|-p|-b)\b|mix\s+test\b|mvn\s+test\b|\.\/gradlew\s+test\b|claude\s+plugin\s+test\b)/

const TREES_SCRIPT = [
  'idx=$(mktemp) || exit 1',
  'cp "$(git rev-parse --git-path index)" "$idx" 2>/dev/null || rm -f "$idx"',
  'GIT_INDEX_FILE="$idx" git add -u >/dev/null 2>&1; GIT_INDEX_FILE="$idx" git write-tree',
  'GIT_INDEX_FILE="$idx" git add -A >/dev/null 2>&1; GIT_INDEX_FILE="$idx" git write-tree',
  'rm -f "$idx"',
].join('\n')

let cwd = ''
let extraCheck: RegExp | null = null
let allowUntil = 0
let shownStatus: string | undefined

// ---------- Reading a shell command ----------

const unquote = (word: string): string => word.replace(/^(['"])(.*)\1$/, '$2')
const resolve = (dir: string, path: string): string => (path.startsWith('/') ? path : `${dir}/${path}`)

// Splits a command into its pieces, tracking `cd` so each piece knows its directory.
const segmentsOf = (command: string, base: string): Segment[] => {
  const parts = command.split(/(\s*(?:&&|\|\||;|\||\n)\s*)/)
  const segments: Segment[] = []
  let dir = base
  for (let i = 0; i < parts.length; i += 2) {
    const text = (parts[i] ?? '').trim()
    const after = parts.slice(i + 1).join('')
    const words = text.split(/\s+/)
    if (words[0] === 'cd' && words[1] !== undefined) {
      dir = resolve(dir, unquote(words[1]))
      continue
    }
    if (text !== '') segments.push({ text, dir, after })
  }
  return segments
}

const wordsOf = (text: string): string[] => {
  const words = text.split(/\s+/).map(unquote)
  while (words[0] !== undefined && /^[A-Za-z_]\w*=/.test(words[0])) words.shift()
  if (words[0] === 'command' || words[0] === 'exec') words.shift()
  return words
}

const shipIn = (command: string, base: string): Ship | undefined => {
  for (const segment of segmentsOf(command, base)) {
    const words = wordsOf(segment.text)
    if (words[0] === 'git') {
      let i = 1
      let dir = segment.dir
      while (words[i] === '-C' || words[i] === '-c') {
        if (words[i] === '-C' && words[i + 1] !== undefined) dir = resolve(segment.dir, words[i + 1] ?? '')
        i += 2
      }
      if (words[i] === 'push') return { kind: 'push', dir, args: words.slice(i + 1), label: 'git push' }
    }
    if (words[0] === 'gh' && words[1] === 'pr' && words[2] === 'create') {
      return { kind: 'pr', dir: segment.dir, args: words.slice(3), label: 'gh pr create' }
    }
  }
  return undefined
}

// The check a Bash call ran, when its exit code speaks for that check: nothing
// after it may pipe, mask or replace the status.
const checkIn = (command: string, base: string): Segment | undefined => {
  for (const segment of segmentsOf(command, base)) {
    if (!CHECK.test(segment.text) && !(extraCheck?.test(segment.text) ?? false)) continue
    const rest = segment.after.replace(/[12]?>&[12]/g, '')
    if (/\|\||;|\|/.test(rest) || /(^|[^&])&($|[^&])/.test(rest)) return undefined
    return segment
  }
  return undefined
}

// The lizard --local verdict a message prints: the JSON between the marker lines.
const lizardVerdictIn = (text: string): string | undefined => {
  const block = /^LIZARD_PAYLOAD_BEGIN[ \t]*\n([\s\S]*?)\n^LIZARD_PAYLOAD_END[ \t]*$/m.exec(text)
  if (block === null) return undefined
  try {
    const payload = JSON.parse(block[1] ?? '') as { event?: unknown }
    return typeof payload.event === 'string' && VERDICTS.has(payload.event) ? payload.event : undefined
  } catch {
    return undefined
  }
}

// ---------- The repo ----------

const rootOf = async ($: EngineInterface, dir: string): Promise<string | undefined> => {
  const top = await $.process.run(['git', 'rev-parse', '--show-toplevel'], { cwd: dir })
  return top.exitCode === 0 ? top.stdout.trim() : undefined
}

const treesOf = async ($: EngineInterface, root: string): Promise<Trees> => {
  const out = await $.process.run(['/bin/sh', '-c', TREES_SCRIPT], { cwd: root })
  const [tracked = '', all = ''] = out.stdout.trim().split('\n')
  return { tracked, all }
}

const treeOfRev = async ($: EngineInterface, root: string, rev: string): Promise<string | undefined> => {
  const out = await $.process.run(['git', 'rev-parse', '--verify', '--quiet', `${rev}^{tree}`], { cwd: root })
  return out.exitCode === 0 ? out.stdout.trim() : undefined
}

const branchOf = async ($: EngineInterface, root: string): Promise<string> =>
  (await $.process.run(['git', 'branch', '--show-current'], { cwd: root })).stdout.trim()

const defaultBranchOf = async ($: EngineInterface, root: string): Promise<string> => {
  const head = await $.process.run(['git', 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], { cwd: root })
  return head.exitCode === 0 ? head.stdout.trim().replace(/^origin\//, '') : 'main'
}

const storeKey = (root: string): string => `ship:${root}`

const load = async ($: EngineInterface, root: string): Promise<Evidence> => {
  const stored = (await $.store.get(storeKey(root))) as Partial<Evidence> | undefined
  return { checks: stored?.checks ?? [], lizard: stored?.lizard ?? [] }
}

const saveCheck = async ($: EngineInterface, root: string, run: CheckRun): Promise<void> => {
  const evidence = await load($, root)
  await $.store.set(storeKey(root), { ...evidence, checks: [...evidence.checks, run].slice(-CHECKS_KEPT) })
}

const saveLizard = async ($: EngineInterface, root: string, run: LizardRun): Promise<void> => {
  const evidence = await load($, root)
  await $.store.set(storeKey(root), { ...evidence, lizard: [...evidence.lizard, run].slice(-LIZARD_KEPT) })
}

// ---------- Verdicts ----------

const isOn = (run: Trees, tree: string): boolean => run.tracked === tree || run.all === tree

// Green when the latest run of every check that ran on this content passed.
const checksOn = (evidence: Evidence, tree: string): { state: 'green' | 'red' | 'none'; failed: string[] } => {
  const latest = new Map<string, CheckRun>()
  for (const run of evidence.checks) if (isOn(run, tree)) latest.set(run.command, run)
  if (latest.size === 0) return { state: 'none', failed: [] }
  const failed = [...latest.values()].filter(run => !run.isOk).map(run => run.command)
  return { state: failed.length > 0 ? 'red' : 'green', failed }
}

const lizardOn = (evidence: Evidence, tree: string): string | undefined =>
  [...evidence.lizard].reverse().find(run => isOn(run, tree))?.event

const short = (sha: string): string => sha.slice(0, 7)

// What a held push or PR is missing, one reason a line; empty lets it through.
const reasonsFor = async ($: EngineInterface, ship: Ship, holdMain: boolean, needLizard: boolean): Promise<string[]> => {
  const root = await rootOf($, ship.dir)
  if (root === undefined) return []
  const positional = ship.args.filter(arg => !arg.startsWith('-'))
  if (ship.kind === 'push' && ship.args.some(arg => /^(--tags|--delete|-d|--mirror|--prune)$/.test(arg))) return []

  const [branch, main] = await Promise.all([branchOf($, root), defaultBranchOf($, root)])
  const refspecs = ship.kind === 'push' ? positional.slice(1) : []
  const pairs = refspecs.length === 0
    ? [{ src: 'HEAD', dst: branch }]
    : refspecs.map(spec => {
        const [src = '', dst] = spec.replace(/^\+/, '').split(':')
        return { src, dst: (dst ?? src).replace(/^refs\/heads\//, '') }
      })

  const reasons: string[] = []
  if (ship.kind === 'push' && holdMain) {
    const onto = pairs.find(pair => pair.dst === main || ((pair.dst === 'HEAD' || pair.dst === '') && branch === main))
    if (onto !== undefined) reasons.push(`it pushes straight to ${main}. Push a branch and open a PR instead.`)
  }

  const evidence = await load($, root)
  for (const pair of pairs) {
    if (pair.src === '') continue
    const tree = await treeOfRev($, root, pair.src)
    if (tree === undefined) continue
    const name = pair.src === 'HEAD' ? branch || 'HEAD' : pair.src
    const checks = checksOn(evidence, tree)
    if (checks.state === 'none') reasons.push(`no check has run on exactly what ${name} holds (tree ${short(tree)}). Run the repo's tests or checks first.`)
    if (checks.state === 'red') reasons.push(`a check failed on what ${name} holds: ${checks.failed.map(c => `\`${c}\``).join(', ')}.`)
    if (ship.kind === 'pr' && needLizard) {
      const verdict = lizardOn(evidence, tree)
      if (verdict === undefined) reasons.push(`lizard --local has not reviewed what ${name} holds. Run it before opening the PR.`)
      else if (verdict !== 'APPROVE') reasons.push(`lizard's verdict on what ${name} holds is ${verdict}. Fix what it found and run it again.`)
    }
  }
  return reasons
}

// Records a lizard --local verdict the text prints, against the content it reviewed.
const noteLizard = async ($: EngineInterface, text: string): Promise<void> => {
  const verdict = text.includes('LIZARD_PAYLOAD_BEGIN') ? lizardVerdictIn(text) : undefined
  if (verdict === undefined) return
  const root = await rootOf($, cwd)
  if (root === undefined) return
  const [trees, at] = await Promise.all([treesOf($, root), $.clock.now()])
  await saveLizard($, root, { ...trees, event: verdict, at })
}

const statusFor = async ($: EngineInterface, root: string): Promise<string | undefined> => {
  const [branch, main] = await Promise.all([branchOf($, root), defaultBranchOf($, root)])
  if (branch === '' || branch === main) return undefined
  const [trees, evidence] = await Promise.all([treesOf($, root), load($, root)])
  const checks = checksOn(evidence, trees.all)
  const lizard = lizardOn(evidence, trees.all)
  const checkMark = checks.state === 'green' ? '✓' : checks.state === 'red' ? '✗' : '–'
  const lizardMark = lizard === 'APPROVE' ? '🦎' : lizard === undefined ? '–' : '✗'
  return `ship: checks ${checkMark} · lizard ${lizardMark}`
}

const showStatus = async ($: EngineInterface): Promise<void> => {
  const root = cwd === '' ? undefined : await rootOf($, cwd)
  const text = root === undefined ? undefined : await statusFor($, root)
  if (text !== shownStatus) {
    shownStatus = text
    $.ui.status(text)
  }
}

const report = async ($: EngineInterface, holdMain: boolean, needLizard: boolean): Promise<string> => {
  const root = await rootOf($, cwd)
  if (root === undefined) return 'ship-gate: not in a git repo.'
  const push = await reasonsFor($, { kind: 'push', dir: root, args: [], label: 'git push' }, holdMain, needLizard)
  const pr = await reasonsFor($, { kind: 'pr', dir: root, args: [], label: 'gh pr create' }, holdMain, needLizard)
  const line = (label: string, reasons: string[]) =>
    reasons.length === 0 ? `✓ \`${label}\` would go through.` : `✗ \`${label}\` would be held: ${reasons.join(' ')}`
  return [line('git push', push), line('gh pr create', pr)].join('\n')
}

// ---------- Hooks ----------

export const register: Register = (on, options) => {
  const holdMain = options['holdMainPush'] !== false
  const needLizard = options['requireLizard'] !== false
  const extra = String(options['extraCheck'] ?? '').trim()
  try {
    extraCheck = extra === '' ? null : new RegExp(extra)
  } catch {
    extraCheck = null
  }

  on('session.start', async ($, e, next) => {
    cwd = e.cwd
    await $.command.register({
      name: 'ship',
      description: 'What a git push or gh pr create would face now (/ship allow lets the next one through)',
    })
    await showStatus($).catch(() => undefined)
    return next(e)
  })

  on('command.run', { command: 'ship' }, async ($, e) => {
    if (e.args.trim() === 'allow') {
      // Only the person at the prompt may wave one through, never the model.
      if (e.origin.kind !== 'composer') return { text: 'ship-gate: /ship allow only works when the person types it.' }
      allowUntil = (await $.clock.now()) + ALLOW_MS
      return { text: 'ship-gate: the next held push or PR in the next 10 minutes goes through.' }
    }
    return { text: await report($, holdMain, needLizard) }
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ship = shipIn(e.command, cwd)
    if (ship !== undefined) {
      const reasons = await reasonsFor($, ship, holdMain, needLizard)
      if (reasons.length > 0) {
        if ((await $.clock.now()) < allowUntil) {
          allowUntil = 0
          $.ui.toast(`ship-gate: let ${ship.label} through once, as you allowed.`)
          return next(e)
        }
        $.ui.toast(`ship-gate held ${ship.label}`)
        return {
          deny: `ship-gate held \`${ship.label}\`:\n${reasons.map(reason => `- ${reason}`).join('\n')}\nDo that, then try again. If the person wants it through as it is, they type /ship allow.`,
        }
      }
      return next(e)
    }

    const ran = await next(e)
    const check = e.run_in_background === true ? undefined : checkIn(e.command, cwd)
    if (check !== undefined && ran.deny === undefined) {
      const root = await rootOf($, check.dir)
      if (root !== undefined) {
        const [trees, at] = await Promise.all([treesOf($, root), $.clock.now()])
        await saveCheck($, root, { ...trees, command: check.text, isOk: ran.isError !== true, at })
      }
    }
    return ran
  })

  // The verdict as its text block lands, mid-turn: shepherd prints it and goes
  // straight on to push. A subagent's rows come through here too.
  on('session.append', async ($, e, next) => {
    const stored = await next(e)
    if (e.message.role !== 'assistant') return stored
    for (const block of e.message.content) {
      if (block.type === 'text' && typeof block.text === 'string') await noteLizard($, block.text)
    }
    return stored
  })

  on('turn.complete', async ($, e, next) => {
    // The turn's final answer, where lizard --local ends when run on its own.
    await noteLizard($, e.answer)
    if (e.agentId === undefined) await showStatus($).catch(() => undefined)
    return next(e)
  })
}
