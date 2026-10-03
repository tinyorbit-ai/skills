import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

type World = {
  branch: string
  tracked: string
  all: string
  heads: Record<string, string>
  failing: string[]
  ran: string[]
}

const SESSION = { cwd: '/repo', surface: 'terminal', isInteractive: true } as const
const PRESENTATION = { isFullscreen: true, columns: 120 } as const

const out = (stdout: string, exitCode = 0) => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

// The repo, shell and transcript beneath the plugin.
const machine = (on: On, world: World): { toasts: string[] } => {
  const toasts: string[] = []
  on('process.run', ($, e) => {
    const [bin, a, b, , rev] = e.argv
    if (bin === 'git' && a === 'rev-parse' && b === '--show-toplevel') return out('/repo\n')
    if (bin === 'git' && a === 'rev-parse' && b === '--verify') {
      const tree = world.heads[String(rev).replace('^{tree}', '')]
      return tree === undefined ? out('', 1) : out(`${tree}\n`)
    }
    if (bin === 'git' && a === 'branch') return out(`${world.branch}\n`)
    if (bin === 'git' && a === 'symbolic-ref') return out('origin/main\n')
    if (bin === '/bin/sh' && b?.includes('write-tree')) return out(`${world.tracked}\n${world.all}\n`)
    return out('', 127)
  })
  on('command.register', () => ({ value: { command: 'ship' } }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('tool.call', { tool: 'Bash' }, ($, e) => {
    world.ran.push(e.command)
    return world.failing.some(command => e.command.includes(command))
      ? { result: 'failed', text: 'Exit code 1', isError: true as const }
      : { result: { stdout: 'ok', stderr: '' }, text: 'ok' }
  })
  return { toasts }
}

const bash = (command: string) => ({ tool: 'Bash', command }) as const

// A turn ending the way lizard --local ends: the verdict, then the payload block.
const lizardSays = (answer: string) =>
  ({ answer, durationMs: 1, isAborted: false, turnId: 'lizard', reason: 'answer' }) as const

const payload = (event: string) =>
  `🦎\n\nNo findings.\n\nLIZARD_PAYLOAD_BEGIN\n{"event":"${event}","body":"🦎","comments":[]}\nLIZARD_PAYLOAD_END`

const feature = (): World => ({
  branch: 'feat/dedupe',
  tracked: 'T1',
  all: 'T1',
  heads: { HEAD: 'T1', 'feat/dedupe': 'T1' },
  failing: [],
  ran: [],
})

test('a push waits for a check that passed on exactly what it pushes', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const world = feature()
  const { toasts } = machine(on, world)
  await $.session.start(SESSION)

  const held = await $.tool.call(bash('git push -u origin HEAD'))
  expect(held.deny).toContain('no check has run on exactly what feat/dedupe holds')
  expect(world.ran).toEqual([])
  expect(toasts).toContain('ship-gate held git push')

  await $.tool.call(bash('cd /repo && bun test'))
  expect((await $.tool.call(bash('git push -u origin HEAD'))).deny).toBeUndefined()
  expect(world.ran).toContain('git push -u origin HEAD')

  // New content committed after the run: the check no longer speaks for it.
  world.heads = { HEAD: 'T2', 'feat/dedupe': 'T2' }
  expect((await $.tool.call(bash('git push'))).deny).toContain('no check has run')
})

test('checking, then committing, then pushing goes through', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const world = { ...feature(), heads: { HEAD: 'T0' }, tracked: 'T5', all: 'T5+notes' }
  machine(on, world)
  await $.session.start(SESSION)

  // Checks ran on uncommitted work beside an untracked note that is never committed.
  await $.tool.call(bash('pnpm run typecheck && pnpm test'))
  world.heads = { HEAD: 'T5' }
  expect((await $.tool.call(bash('git push'))).deny).toBeUndefined()
})

test('a failed, piped or masked check is no evidence', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const world = { ...feature(), failing: ['bun test'] }
  machine(on, world)
  await $.session.start(SESSION)

  await $.tool.call(bash('bun test'))
  expect((await $.tool.call(bash('git push'))).deny).toContain('a check failed on what feat/dedupe holds: `bun test`')

  world.failing = []
  const fresh = { ...world, tracked: 'T9', all: 'T9', heads: { HEAD: 'T9' } }
  Object.assign(world, fresh)
  await $.tool.call(bash('bun test | tail -5'))
  await $.tool.call(bash('bun test || true'))
  await $.tool.call(bash('bun test; echo done'))
  expect((await $.tool.call(bash('git push'))).deny).toContain('no check has run')
})

test('pushes onto main are held even when the checks are green', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const world = feature()
  machine(on, world)
  await $.session.start(SESSION)
  await $.tool.call(bash('bun test'))

  expect((await $.tool.call(bash('git push origin HEAD:main'))).deny).toContain('pushes straight to main')
  world.branch = 'main'
  world.heads = { ...world.heads, main: 'T1' }
  expect((await $.tool.call(bash('git -C /repo push'))).deny).toContain('pushes straight to main')
  expect((await $.tool.call(bash('git push --tags'))).deny).toBeUndefined()
})

test('a PR waits for lizard to approve exactly what it opens', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const world = feature()
  machine(on, world)
  await $.session.start(SESSION)
  await $.tool.call(bash('bun test'))

  const create = bash('gh pr create --title "Dedupe" --body "x"')
  expect((await $.tool.call(create)).deny).toContain('lizard --local has not reviewed')

  await $.turn.complete(lizardSays(payload('REQUEST_CHANGES')))
  expect((await $.tool.call(create)).deny).toContain("lizard's verdict on what feat/dedupe holds is REQUEST_CHANGES")

  await $.turn.complete({ ...lizardSays(payload('APPROVE')), agentId: 'agent-lizard' })
  expect((await $.tool.call(create)).deny).toBeUndefined()
})

test('lizard instructions that quote the markers are not a verdict', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const world = feature()
  machine(on, world)
  await $.session.start(SESSION)
  await $.tool.call(bash('bun test'))

  await $.turn.complete(
    lizardSays('Print `LIZARD_PAYLOAD_BEGIN` / `LIZARD_PAYLOAD_END` around {"event":"APPROVE|COMMENT|REQUEST_CHANGES"}'),
  )
  await $.turn.complete(lizardSays('LIZARD_PAYLOAD_BEGIN\n{"event":"APPROVE|COMMENT|REQUEST_CHANGES"}\nLIZARD_PAYLOAD_END'))
  expect((await $.tool.call(bash('gh pr create'))).deny).toContain('lizard --local has not reviewed')
})

test('/ship allow lets one through, and only from the person', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const world = feature()
  machine(on, world)
  await $.session.start(SESSION)

  const fromModel = await $.command.run({ command: 'ship', args: 'allow', origin: { kind: 'sdk' }, presentation: PRESENTATION })
  expect(fromModel.text).toContain('only works when the person types it')
  expect((await $.tool.call(bash('git push'))).deny).toBeDefined()

  await $.command.run({ command: 'ship', args: 'allow', origin: { kind: 'composer' }, presentation: PRESENTATION })
  expect((await $.tool.call(bash('git push'))).deny).toBeUndefined()
  expect((await $.tool.call(bash('git push'))).deny).toBeDefined()
})

test('/ship reports what a push and a PR would face', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const world = feature()
  machine(on, world)
  await $.session.start(SESSION)
  await $.tool.call(bash('bun test'))

  const status = await $.command.run({ command: 'ship', args: '', origin: { kind: 'composer' }, presentation: PRESENTATION })
  expect(status.text).toContain('✓ `git push` would go through.')
  expect(status.text).toContain('✗ `gh pr create` would be held: lizard --local has not reviewed')
})
