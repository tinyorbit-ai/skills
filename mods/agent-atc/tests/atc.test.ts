import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  component: 'Pane',
  requestId: 'agent-atc',
  props: {
    title: 'Agents',
    isFocused: true,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

const SPAWN = {
  tool_use_id: 'toolu_spawn',
  prompt: 'Build the billing API',
  description: 'billing api',
  subagentType: 'general-purpose',
  provider: { plugin: 'engine', tier: 'core' },
  parentModel: 'claude-opus-5-5',
  background: true,
  fork: false,
} as const

const SURFACES = ['terminal', 'desktop'] as const

test('a spawned agent and its tool calls show in the pane', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: 'agent-1' }))
  on('tool.call', () => ({ result: { stdout: 'ok', stderr: '' } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))

  await $.agent.spawn(SPAWN)
  // A subagent's call: the engine stamps agentId, which the kit's call type leaves out.
  const fromAgent = { tool: 'Bash', command: 'bun test billing', agentId: 'agent-1' } as const
  await $.tool.call(fromAgent)
  await $.tool.call({ tool: 'Read', file_path: '/repo/src/billing/plan.ts' })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'agent-atc', surface, ...PANE })
    expect(await ui.find({ text: /1 running/ })).toBeDefined()
    expect(await ui.find({ text: /main: ✓ Read billing\/plan\.ts/ })).toBeDefined()
    expect(await ui.find({ key: 'pick-agent-1' })).toBeDefined()
    expect(await ui.find({ text: /1 calls/ })).toBeUndefined()

    await ui.press({ key: 'pick-agent-1' })
    expect(await ui.find({ text: /general-purpose · opus-5-5 · started .* · 1 calls/ })).toBeDefined()
    expect(await ui.find({ text: /✓ / })).toBeDefined()

    await ui.press({ key: 'back' })
    expect(await ui.find({ text: /1 calls/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('the message box and Stop reach the picked agent', async ($, on) => {
  mock.clock(on)
  const sent: unknown[] = []
  const stopped: unknown[] = []
  on('agent.spawn', () => ({ model: 'claude-sonnet-5-5', agentId: 'agent-2' }))
  on('session.send', ($, e) => {
    sent.push(e)
    return { isDelivered: true }
  })
  on('tool.call', { tool: 'TaskStop' }, ($, e) => {
    stopped.push(e.task_id)
    return { result: { message: 'stopped', task_id: 'agent-2', task_type: 'local_agent' } }
  })
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))

  await $.agent.spawn({ ...SPAWN, name: 'billing' })

  const ui = await $.ui.mount({ plugin: 'agent-atc', surface: 'terminal', ...PANE })
  await ui.press({ key: 'pick-agent-2' })
  await ui.input({ key: 'msg-agent-2', text: 'Only touch billing code' })
  expect(sent).toHaveLength(1)
  expect(sent[0]).toMatchObject({ text: 'Only touch billing code' })
  expect(JSON.stringify(sent[0])).toContain('agent-2')

  await ui.press({ key: 'stop' })
  expect(stopped).toEqual(['agent-2'])
})

test('finished, killed, quiet and earlier agents read right', async ($, on) => {
  const clock = mock.clock(on, { now: 0 })
  const status: (string | undefined)[] = []
  let listed = [{ id: 'agent-3', description: 'research', type: 'Explore', status: 'running' }]
  on('agent.spawn', ($, e) =>
    e.description === 'research'
      ? { model: 'claude-haiku-4-5', agentId: 'agent-3' }
      : { model: 'claude-opus-5-5', agentId: 'agent-5' },
  )
  on('agent.list', () => ({ value: listed }))
  on('command.register', () => ({ value: { command: 'atc' } }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('ui.status', ($, e) => {
    status.push(e.text)
    return { value: undefined }
  })
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('ui.open', () => ({ value: { isPlaced: true } }))

  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  await $.agent.spawn({ ...SPAWN, description: 'research', subagentType: 'Explore' })
  await $.agent.spawn({ ...SPAWN, tool_use_id: 'toolu_slow', description: 'slow migration' })
  expect(status[status.length - 1]).toBe('agents: 2 running · /atc')

  await clock.advance(5_000)
  await $.turn.complete({
    answer: 'Found 3 webhook handlers.\nDetails follow.',
    durationMs: 5_000,
    isAborted: false,
    turnId: 'turn-3',
    agentId: 'agent-3',
    reason: 'answer',
  })

  listed = [
    { id: 'agent-3', description: 'research', type: 'Explore', status: 'completed' },
    { id: 'agent-4', description: 'security audit', type: 'general-purpose', status: 'killed' },
    { id: 'agent-5', description: 'slow migration', type: 'general-purpose', status: 'running' },
  ]
  await clock.advance(120_000)

  const ui = await $.ui.mount({ plugin: 'agent-atc', surface: 'terminal', ...PANE })
  expect(await ui.find({ text: /done in 5s/ })).toBeDefined()
  expect(await ui.find({ text: /killed after/ })).toBeDefined()
  expect(await ui.find({ key: 'pick-agent-4' })).toBeDefined()
  expect(await ui.find({ text: /quiet 2m/ })).toBeDefined()
  expect(await ui.find({ text: /1 running · 1 done · 1 stopped or failed/ })).toBeDefined()

  await ui.press({ key: 'pick-agent-3' })
  expect(await ui.find({ text: /Answer: Found 3 webhook handlers\. Details follow\./ })).toBeDefined()
  expect(await ui.find({ key: 'stop' })).toBeUndefined()
  expect(status[status.length - 1]).toBe('agents: 1 running · /atc')
})
