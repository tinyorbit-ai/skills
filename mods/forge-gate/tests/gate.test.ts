import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const PLAN = `# Plan

## Phase 1 — Scaffold
**Branch:** \`phase/1-scaffold\`
**Verifiable gate:** \`bun test\` passes.
**Design:** none

## Phase 2 — Dedupe a folder
**Branch:** \`phase/2-dedupe\`
**Goal:** users can dedupe a folder from the CLI
**Verifiable gate:** \`dedupe ./fixtures/dupes\` exits 0 and prints "reclaimed 312 MB";
\`dedupe ./fixtures/clean\` prints "nothing to do". Then \`pnpm release:production\`, run
\`bun run smoke -- --work <trial-id>\` and confirm \`userId IS NULL\` for every imported row.
**Design:** none
**Work:**
- the dedupe command

## Phase 3 — Icon
**Branch:** \`phase/3-icon\`
**Verifiable gate:** open the app on the phone and the icon shows the orbit mark at every size.
**Design:** follow DESIGN.md
`

type World = {
  branch: string
  tree: string
  results: Record<string, { exitCode: number; stdout: string }>
  ran: string[]
}

const BAND = {
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 6,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 6 },
    view: {},
  },
} as const

const DUPES = { tool: 'Bash', command: 'dedupe ./fixtures/dupes' } as const
const CLEAN = { tool: 'Bash', command: 'cd /repo && dedupe ./fixtures/clean 2>&1' } as const

// The machine beneath the plugin: git, the plan, the shell and the person.
const machine = (on: On, world: World): { asked: string[]; toasts: string[] } => {
  const asked: string[] = []
  const toasts: string[] = []
  const out = (stdout: string, exitCode = 0) => ({
    value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  })
  on('process.run', ($, e) => {
    const [bin, flag, script, , token] = e.argv
    if (bin === 'git' && flag === 'rev-parse') return out('/repo\n')
    if (bin === 'git' && flag === 'branch') return out(`${world.branch}\n`)
    if (bin === '/bin/sh' && script?.startsWith('git rev-parse HEAD')) return out(world.tree)
    if (bin === '/bin/sh' && script?.startsWith('command -v')) return out('', token === 'dedupe' ? 0 : 1)
    if (bin === '/bin/sh' && script !== undefined) {
      world.ran.push(script)
      const result = world.results[script] ?? { exitCode: 0, stdout: 'ok' }
      return out(result.stdout, result.exitCode)
    }
    return out('', 127)
  })
  on('fs.read', () => ({ value: PLAN }))
  on('command.register', () => ({ value: { command: 'gate' } }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('classic.Stop', () => ({}))
  // What the engine draws above the prompt when no plugin adds anything.
  on('ui.render', () => ({ type: 'Box', props: {}, children: [] }))
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('tool.call', { tool: 'AskUserQuestion' }, ($, e) => {
    const question = e.questions[0]?.question ?? ''
    asked.push(question)
    return { result: { questions: e.questions, answers: { [question]: 'Run' } } }
  })
  on('tool.call', ($, e) =>
    world.results[String((e as { command?: string }).command)]?.exitCode === 1
      ? { result: 'failed', text: 'Exit code 1\nboom', isError: true as const }
      : { result: { stdout: 'reclaimed 312 MB', stderr: '' }, text: 'reclaimed 312 MB' },
  )
  return { asked, toasts }
}

const SESSION = { cwd: '/repo', surface: 'terminal', isInteractive: true } as const

const turnEnd = { answer: '', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' } as const

test('the band follows the gate on this exact tree', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  const world: World = { branch: 'phase/2-dedupe', tree: 'A', results: {}, ran: [] }
  machine(on, world)
  await $.session.start(SESSION)

  const band = await $.ui.mount({ plugin: 'forge-gate', surface: 'terminal', ...BAND })
  expect(await band.find({ text: /Phase 2 · Dedupe a folder/ })).toBeDefined()
  expect(await band.find({ text: /2 of 2 not run on this tree/ })).toBeDefined()
  expect(await band.find({ text: /\+ written checks/ })).toBeDefined()

  await $.tool.call(DUPES)
  await $.tool.call(CLEAN)
  expect(await band.find({ text: /✓ gate green/ })).toBeDefined()

  await $.tool.call({ tool: 'Edit', file_path: '/repo/src/dedupe.ts', old_string: 'a', new_string: 'b' })
  expect(await band.find({ text: /changed since the last run/ })).toBeDefined()

  await $.turn.complete(turnEnd)
  expect(await band.find({ text: /✓ gate green/ })).toBeDefined()

  world.tree = 'B'
  await $.turn.complete(turnEnd)
  expect(await band.find({ text: /2 of 2 not run on this tree/ })).toBeDefined()
})

test('a run whose exit code something else decides is not evidence', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const world: World = { branch: 'phase/2-dedupe', tree: 'A', results: {}, ran: [] }
  machine(on, world)
  await $.session.start(SESSION)

  await $.tool.call({ tool: 'Bash', command: 'dedupe ./fixtures/dupes | tail -3' })
  await $.tool.call({ tool: 'Bash', command: 'dedupe ./fixtures/clean || true' })
  const band = await $.ui.mount({ plugin: 'forge-gate', surface: 'terminal', ...BAND })
  expect(await band.find({ text: /2 of 2 not run on this tree/ })).toBeDefined()
})

test('a done claim is sent back once while the gate is not green', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const world: World = { branch: 'phase/2-dedupe', tree: 'A', results: {}, ran: [] }
  machine(on, world)
  await $.session.start(SESSION)

  const claim = { stop_hook_active: false, last_assistant_message: 'Phase 2 is done and ready for review.' }
  const first = await $.classic.Stop(claim)
  expect(first.block).toContain('you reported phase 2 as done')
  expect(first.block).toContain('`dedupe ./fixtures/dupes` has not run.')
  expect(first.block).toContain('checks no command proves')

  expect((await $.classic.Stop({ ...claim, stop_hook_active: true })).block).toBeUndefined()
  expect((await $.classic.Stop({ ...claim, last_assistant_message: 'Which fixture folder should I use?' })).block).toBeUndefined()

  world.results['dedupe ./fixtures/dupes'] = { exitCode: 1, stdout: 'boom' }
  await $.tool.call(DUPES)
  expect((await $.classic.Stop(claim)).block).toContain('✗ `dedupe ./fixtures/dupes` failed')

  world.results = {}
  await $.tool.call(DUPES)
  await $.tool.call(CLEAN)
  expect((await $.classic.Stop(claim)).block).toBeUndefined()
})

test('/gate asks first, runs only the safe commands, and reports each', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const world: World = {
    branch: 'phase/2-dedupe',
    tree: 'A',
    results: { 'dedupe ./fixtures/clean': { exitCode: 1, stdout: 'still 3 duplicates' } },
    ran: [],
  }
  const { asked } = machine(on, world)
  await $.session.start(SESSION)

  const run = { command: 'gate', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 120 } } as const
  const first = await $.command.run(run)
  expect(asked).toHaveLength(1)
  expect(asked[0]).toContain('dedupe ./fixtures/dupes')
  expect(asked[0]).not.toContain('release:production')
  expect(asked[0]).not.toContain('<trial-id>')
  expect(asked[0]).not.toContain('userId')
  expect(world.ran).toEqual(['dedupe ./fixtures/dupes', 'dedupe ./fixtures/clean'])
  expect(first.text).toContain('gate red on this tree')
  expect(first.text).toContain('✓ `dedupe ./fixtures/dupes` passed (exit 0).')
  expect(first.text).toContain('✗ `dedupe ./fixtures/clean` failed (exit 1): still 3 duplicates')

  world.results = {}
  const second = await $.command.run(run)
  expect(asked).toHaveLength(1)
  expect(second.text).toContain('gate green on this tree')
})

test('a commandless gate waits for the person to check it', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const world: World = { branch: 'phase/3-icon', tree: 'A', results: {}, ran: [] }
  machine(on, world)
  await $.session.start(SESSION)

  const band = await $.ui.mount({ plugin: 'forge-gate', surface: 'terminal', ...BAND })
  expect(await band.find({ text: /◐ written checks, not checked/ })).toBeDefined()

  const claim = { stop_hook_active: false, last_assistant_message: 'Built phase 3: the icon ships at every size.' }
  expect((await $.classic.Stop(claim)).block).toContain('press Checked')

  await band.press({ key: 'mark-checked' })
  expect(await band.find({ text: /✓ checked by you/ })).toBeDefined()
  expect((await $.classic.Stop(claim)).block).toBeUndefined()
})

test('a pass from an earlier session counts on the same tree', async ($, on) => {
  mock.clock(on, { now: 5_000_000 })
  // The fingerprint the mod takes of a tree whose git output reads "A".
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('A'))
  const treeA = [...new Uint8Array(digest)].slice(0, 10).map(byte => byte.toString(16).padStart(2, '0')).join('')
  const run = (command: string) => ({ command, isOk: true, exitCode: 0, at: 4_000_000, tail: '', tree: treeA, by: 'claude' })
  mock.store(on, {
    'gate:/repo:2': {
      runs: { 'dedupe ./fixtures/dupes': run('dedupe ./fixtures/dupes'), 'dedupe ./fixtures/clean': run('dedupe ./fixtures/clean') },
      checked: null,
    },
  })
  const world: World = { branch: 'phase/2-dedupe', tree: 'A', results: {}, ran: [] }
  machine(on, world)
  await $.session.start(SESSION)

  const band = await $.ui.mount({ plugin: 'forge-gate', surface: 'terminal', ...BAND })
  expect(await band.find({ text: /✓ gate green 16m ago/ })).toBeDefined()
})

test('outside a phase branch the mod stays out of the way', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const world: World = { branch: 'main', tree: 'A', results: {}, ran: [] }
  machine(on, world)
  await $.session.start(SESSION)

  const band = await $.ui.mount({ plugin: 'forge-gate', surface: 'terminal', ...BAND })
  expect(await band.find({ text: /Phase/ })).toBeUndefined()
  expect((await $.classic.Stop({ stop_hook_active: false, last_assistant_message: 'Phase 2 is done.' })).block).toBeUndefined()
})
