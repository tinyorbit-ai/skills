import { expect, mock, test } from 'claude-code/testing'
import type { ModelCompleteResult, On } from 'claude-code'

const PANE = {
  component: 'Pane',
  requestId: 'hud',
  props: {
    title: 'HUD',
    isFocused: true,
    bodyColumns: 48,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

const BAND = {
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 8,
    bodyColumns: 110,
    scroll: { offset: 0, bodyRows: 8 },
    view: {},
  },
} as const

const SURFACES = ['terminal', 'desktop'] as const

const USAGE = { input_tokens: 900, output_tokens: 120, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

type World = {
  // What the reader model answers each time it is asked, in order; the last one repeats.
  replies: ModelCompleteResult[]
  read: { model: string; prompt: string; system: string | undefined }[]
  filled: string[]
  opened: string[]
  copied: string[]
  // The banner frames painted, as cells.
  blits: string[]
  // Where the session draws; empty for a -p run or an SDK worker.
  surfaces: ('terminal' | 'desktop')[]
}

const world = (...replies: ModelCompleteResult[]): World => ({ replies, read: [], filled: [], opened: [], copied: [], blits: [], surfaces: ['terminal'] })

const reading = (found: Record<string, unknown>): ModelCompleteResult => ({
  isAnswered: true,
  text: `Here it is:\n${JSON.stringify(found)}`,
  usage: USAGE,
})

// The machine beneath the plugin: the reader model, the prompt box and the surface.
const machine = (on: On, w: World): void => {
  on('model.complete', ($, e) => {
    w.read.push({ model: e.model, prompt: e.prompt, system: e.system })
    const reply = (w.replies.length > 1 ? w.replies.shift() : w.replies[0]) ?? reading({})
    return { value: reply }
  })
  on('prompt.fill', ($, e) => {
    w.filled.push(e.text)
    return { isFilled: true, text: e.text, cursor: e.text.length }
  })
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('command.register', () => ({ value: { command: 'hud' } }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('ui.open', ($, e) => {
    w.opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('session.surfaces', () => ({ value: w.surfaces }))
  on('ui.blit', ($, e) => {
    if ('cells' in e) w.blits.push(e.cells)
    return { value: {} }
  })
  on('ui.copy', ($, e) => {
    w.copied.push(e.text)
    return { value: { isCopied: true } }
  })
  on('ui.toast', () => ({ value: undefined }))
  // What the engine draws above the prompt when no plugin adds anything.
  on('ui.render', () => ({ type: 'Box', props: {}, children: [] }))
}

const typed = (text: string) => ({ text, wait: false, origin: { kind: 'composer' } }) as const

const ended = (answer: string, turnId = 'turn-1') =>
  ({ answer, durationMs: 4_000, isAborted: false, turnId, reason: 'answer' }) as const

const FIRST = reading({
  resolved: [],
  asks: ['Should I bump forge-gate so both bands stack?'],
  answers: [{ q: 'Does it work on desktop?', a: 'Yes. The band and the pane both draw there.' }],
  links: [
    { kind: 'pr', label: '', href: 'https://github.com/tinyorbit-ai/skills/pull/41' },
    { kind: 'file', label: 'register.tsx', href: '/Users/me/code/skills/mods/hud/hooks/register.tsx:12' },
    { kind: 'link', label: 'bad', href: 'javascript:alert(1)' },
  ],
  notes: ['Not checked in the desktop app yet.'],
  tips: ['A pane opened unasked only seats on a wide terminal.'],
  next: 'Install the mod and open the desktop app.',
})

test('a finished turn fills the pane on every surface', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  const w = world(FIRST)
  machine(on, w)

  await $.prompt.submit(typed('Does it work on desktop? Then open the PR.'))
  await $.turn.start({ text: 'Does it work on desktop? Then open the PR.', turnId: 'turn-1' })
  await $.turn.complete(ended('Yes, it draws on desktop. PR: https://github.com/tinyorbit-ai/skills/pull/41'))
  expect(w.read).toHaveLength(0)
  await clock.advance(5)

  expect(w.read).toHaveLength(1)
  expect(w.read[0]?.model).toBe('haiku')
  const sent = JSON.parse(w.read[0]?.prompt ?? '{}')
  expect(sent.person).toEqual(['Does it work on desktop? Then open the PR.'])
  expect(sent.reply).toContain('it draws on desktop')
  expect(sent.open).toEqual([])

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'hud', surface, ...PANE })
    expect(await ui.find({ text: 'NEEDS YOU' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Should I bump forge-gate so both bands stack\?$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Yes\. The band and the pane both draw there\.$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Not checked in the desktop app yet\.$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Did you know\? A pane opened unasked only seats on a wide terminal\.$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Install the mod and open the desktop app\.$/ })).toBeDefined()

    // A terminal opens a file; the other surfaces are sent https links only, so the
    // file is a button that copies its path.
    const links = await ui.findAll({ type: 'Link' })
    expect(links.map(link => link.props['href'])).toEqual(
      surface === 'terminal'
        ? ['https://github.com/tinyorbit-ai/skills/pull/41', 'file:///Users/me/code/skills/mods/hud/hooks/register.tsx']
        : ['https://github.com/tinyorbit-ai/skills/pull/41'],
    )
    expect(links[0]?.children).toEqual(['tinyorbit-ai/skills#41'])
    if (surface === 'desktop') {
      await ui.press({ key: 'copy-l1000001-1' })
      expect(w.copied).toEqual(['/Users/me/code/skills/mods/hud/hooks/register.tsx:12'])
    }
    expect(await ui.find({ text: /haiku read the last turn .* 1\.0k tok/ })).toBeDefined()
    expect(await ui.findAll({ type: 'Raster' })).toHaveLength(surface === 'terminal' ? 1 : 0)
    await ui.unmount()
  }
})

test('answer puts the question in the prompt box, and done or the next turn closes it', async ($, on) => {
  const clock = mock.clock(on, { now: 2_000_000 })
  const second = reading({ resolved: ['q2000001-0'], asks: [], answers: [], links: [], notes: [], next: null })
  const w = world(
    reading({ resolved: [], asks: ['Ship it tonight?', 'Rename the pane?'], answers: [], links: [], notes: [], next: null }),
    second,
  )
  machine(on, w)

  await $.turn.complete(ended('Two things for you: ship it tonight? And rename the pane?'))
  await clock.advance(5)

  const ui = await $.ui.mount({ plugin: 'hud', surface: 'terminal', ...PANE })
  await ui.press({ key: 'answer-q2000001-0' })
  expect(w.filled).toEqual(['About "Ship it tonight?": '])

  await ui.press({ key: 'done-q2000001-1' })
  expect(await ui.find({ text: 'Rename the pane?' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^Ship it tonight\?$/ })).toBeDefined()

  await $.prompt.submit(typed('yes ship it'))
  await $.turn.complete(ended('Shipping now.', 'turn-2'))
  await clock.advance(5)
  const sent = JSON.parse(w.read[1]?.prompt ?? '{}')
  expect(sent.open).toEqual([{ id: 'q2000001-0', text: 'Ship it tonight?' }])
  expect(sent.person).toEqual(['yes ship it'])
  expect(await ui.find({ text: 'Ship it tonight?' })).toBeUndefined()
  expect(await ui.find({ text: 'Nothing needs you' })).toBeDefined()
})

test('a question of yours that got no answer waits until a later reply answers it', async ($, on) => {
  const clock = mock.clock(on, { now: 2_500_000 })
  const w = world(
    reading({ answers: [{ id: '', q: 'Does it scale?', a: 'Not answered yet.' }, { id: '', q: 'Is it fast?', a: 'Yes, under 10ms.' }] }),
    // Named again and still unanswered: nothing changes.
    reading({ answers: [{ id: 'a2500001-0', q: 'Does it scale?', a: 'Not answered yet.' }] }),
    reading({ answers: [{ id: 'a2500001-0', q: 'Does it scale?', a: 'Yes, to about 10k rows.' }] }),
  )
  machine(on, w)

  await $.prompt.submit(typed('Does it scale? Is it fast?'))
  await $.turn.complete(ended('It is fast: under 10ms.'))
  await clock.advance(5)
  const ui = await $.ui.mount({ plugin: 'hud', surface: 'terminal', ...PANE })
  expect((await ui.find({ type: 'Text', text: /^Not answered yet\.$/ }))?.props['color']).toBe('warning')

  await $.turn.complete(ended('Still thinking about scale.', 'turn-2'))
  await clock.advance(5)
  expect(JSON.parse(w.read[1]?.prompt ?? '{}').unanswered).toEqual([{ id: 'a2500001-0', q: 'Does it scale?' }])
  expect(await ui.findAll({ type: 'Text', text: /^Does it scale\?$/ })).toHaveLength(1)
  expect(await ui.find({ type: 'Text', text: /^Not answered yet\.$/ })).toBeDefined()

  await $.turn.complete(ended('It scales to about 10k rows.', 'turn-3'))
  await clock.advance(5)
  expect(JSON.parse(w.read[2]?.prompt ?? '{}').unanswered).toEqual([{ id: 'a2500001-0', q: 'Does it scale?' }])
  expect(await ui.find({ text: 'Not answered yet.' })).toBeUndefined()
  expect(await ui.findAll({ type: 'Text', text: /^Does it scale\?$/ })).toHaveLength(1)
  expect(await ui.find({ type: 'Text', text: /^Yes, to about 10k rows\.$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Yes, under 10ms\.$/ })).toBeDefined()
})

test('a question dialog the person closed waits in the HUD, and an answered one does not', async ($, on) => {
  mock.clock(on, { now: 3_000_000 })
  const w = world(reading({}))
  machine(on, w)
  let isClosed = true
  on('tool.call', { tool: 'AskUserQuestion' }, ($, e) =>
    isClosed
      ? { isError: true, result: undefined, text: 'The user closed the dialog.' }
      : { result: { questions: e.questions, answers: { 'Which database?': 'Turso' } } },
  )
  const option = (label: string) => ({ label, description: `Use ${label}.` })
  const ask = {
    tool: 'AskUserQuestion' as const,
    questions: [
      { question: 'Which database?', header: 'Database', multiSelect: false, options: [option('Turso'), option('Postgres')] },
      { question: 'Which region?', header: 'Region', multiSelect: false, options: [option('LHR'), option('FRA')] },
    ],
  }

  await $.tool.call(ask)
  const ui = await $.ui.mount({ plugin: 'hud', surface: 'terminal', ...PANE })
  expect(await ui.find({ type: 'Text', text: /^Which database\?$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Which region\?$/ })).toBeDefined()
  expect(await ui.find({ text: /dialog closed/ })).toBeDefined()

  // Asked again and half answered: the answered one closes, the other still waits.
  isClosed = false
  await $.tool.call(ask)
  expect(await ui.find({ text: 'Which database?' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^Which region\?$/ })).toBeDefined()
})

test('when the reader fails the links are kept and the HUD says so', async ($, on) => {
  const clock = mock.clock(on, { now: 4_000_000 })
  const w = world({ isAnswered: false, reason: 'api-error', status: 529, error: 'overloaded', usage: { ...USAGE, input_tokens: 0, output_tokens: 0 } })
  machine(on, w)

  await $.turn.complete(ended('Deployed to https://hud.example.com/app. Docs at https://docs.example.com/hud.'))
  await clock.advance(5)

  const ui = await $.ui.mount({ plugin: 'hud', surface: 'terminal', ...PANE })
  const links = await ui.findAll({ type: 'Link' })
  expect(links.map(link => link.props['href'])).toEqual(['https://hud.example.com/app', 'https://docs.example.com/hud'])
  expect(await ui.find({ text: /reader failed \(api-error\)/ })).toBeDefined()

  const band = await $.ui.mount({ plugin: 'hud', surface: 'terminal', ...BAND })
  expect(await band.find({ text: /reader failed: api-error/ })).toBeDefined()
})

test('a background shell shows while it runs, and a pull request it opened is a link', async ($, on) => {
  mock.clock(on, { now: 5_000_000 })
  const w = world(reading({}))
  machine(on, w)
  on('tool.call', { tool: 'Bash' }, ($, e) => ({
    result: {
      stdout: e.command.startsWith('gh pr create') ? 'https://github.com/tinyorbit-ai/skills/pull/42\n' : '',
      stderr: '',
      interrupted: false,
      ...(e.run_in_background === true ? { backgroundTaskId: 'bash_7' } : {}),
    },
  }))

  await $.tool.call({ tool: 'Bash', command: 'bun dev', description: 'Start the dev server', run_in_background: true })
  await $.tool.call({ tool: 'Bash', command: 'gh pr create --fill' })

  const ui = await $.ui.mount({ plugin: 'hud', surface: 'terminal', ...PANE })
  expect(await ui.find({ text: 'RUNNING' })).toBeDefined()
  expect(await ui.find({ text: /Start the dev server/ })).toBeDefined()
  expect((await ui.find({ type: 'Link' }))?.children).toEqual(['tinyorbit-ai/skills#42'])

  await $.prompt.submit({
    text: '<task-notification><task-id>bash_7</task-id><status>completed</status></task-notification>',
    wait: false,
    origin: { kind: 'task-notification' },
  })
  expect(await ui.find({ text: 'RUNNING' })).toBeUndefined()
  // The notification is not the person's words: the reader never gets it.
  expect(w.read).toHaveLength(0)
})

test('the band stays out of the way until there is something, then sums it up', async ($, on) => {
  const clock = mock.clock(on, { now: 6_000_000 })
  const w = world(FIRST)
  machine(on, w)

  for (const surface of SURFACES) {
    const quiet = await $.ui.mount({ plugin: 'hud', surface, ...BAND })
    expect(await quiet.find({ text: /HUD/ })).toBeUndefined()
    await quiet.unmount()
  }

  await $.prompt.submit(typed('Does it work on desktop?'))
  await $.turn.complete(ended('Yes.'))
  await clock.advance(5)

  for (const surface of SURFACES) {
    const band = await $.ui.mount({ plugin: 'hud', surface, ...BAND })
    expect(await band.find({ text: /1 need you · 1 answer · 2 links/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /^Should I bump forge-gate so both bands stack\?$/ })).toBeDefined()
    expect(await band.find({ text: /Yes\. The band and the pane both draw there\./ })).toBeDefined()
    expect(await band.findAll({ type: 'Link' })).toHaveLength(surface === 'terminal' ? 2 : 1)
    await band.unmount()
  }

  const survey = await $.ui.mount({ plugin: 'hud', surface: 'terminal', ...BAND, props: { ...BAND.props, hasSurvey: true } })
  expect(await survey.find({ text: /HUD/ })).toBeUndefined()
})

test("a subagent's turn, an interrupted turn and an empty reply are not read", async ($, on) => {
  const clock = mock.clock(on, { now: 7_000_000 })
  const w = world(FIRST)
  machine(on, w)

  await $.turn.complete({ ...ended('Found three handlers.'), agentId: 'agent-1' })
  await $.turn.complete({ ...ended('Half a thought'), isAborted: true, reason: 'aborted' })
  await $.turn.complete(ended('   '))
  await clock.advance(50)
  expect(w.read).toHaveLength(0)
})

test('a session nobody watches costs no model call', async ($, on) => {
  const clock = mock.clock(on, { now: 7_500_000 })
  const w = world(FIRST)
  w.surfaces = []
  machine(on, w)

  await $.prompt.submit({ text: 'Is it done?', wait: false, origin: { kind: 'sdk' } })
  await $.turn.complete(ended('Yes, all done. Want me to deploy?'))
  await clock.advance(50)
  expect(w.read).toHaveLength(0)

  // The same session once a surface attaches (the desktop app) is read.
  w.surfaces = ['desktop']
  await $.turn.complete(ended('Deployed.', 'turn-2'))
  await clock.advance(5)
  expect(w.read).toHaveLength(1)
})

test('/hud opens the pane, and the reader model is a setting', { options: { model: 'claude-haiku-5-5' } }, async ($, on) => {
  const clock = mock.clock(on, { now: 8_000_000 })
  const w = world(FIRST)
  machine(on, w)
  on('command.run', ($, e) => ({ text: `ran ${e.command}` }))

  const ran = await $.command.run({ command: 'hud', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })
  expect(ran.text).toMatch(/HUD open/)
  expect(w.opened).toEqual(['hud'])

  await $.turn.complete(ended('Done.'))
  await clock.advance(5)
  expect(w.read[0]?.model).toBe('claude-haiku-5-5')

  const cleared = await $.command.run({ command: 'hud', args: 'clear', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })
  expect(cleared.text).toBe('HUD cleared.')
  const ui = await $.ui.mount({ plugin: 'hud', surface: 'terminal', ...PANE })
  expect(await ui.find({ text: 'Nothing needs you' })).toBeDefined()
  expect(await ui.findAll({ type: 'Link' })).toHaveLength(0)
})

test('a did-you-know stays up after its turn, and the heads-ups do not', async ($, on) => {
  const clock = mock.clock(on, { now: 9_000_000 })
  const w = world(
    FIRST,
    reading({ tips: ['Hooks on turn.complete hold the turn open.', 'A pane opened unasked only seats on a wide terminal.'] }),
  )
  machine(on, w)

  await $.turn.complete(ended('Done, with one thing unchecked.'))
  await clock.advance(5)
  await $.turn.complete(ended('The read now runs on a timer.', 'turn-2'))
  await clock.advance(5)

  const ui = await $.ui.mount({ plugin: 'hud', surface: 'desktop', ...PANE })
  expect(await ui.find({ text: 'Not checked in the desktop app yet.' })).toBeUndefined()
  const tips = await ui.findAll({ type: 'Text', text: /^Did you know\? ./ })
  expect(tips.map(tip => tip.text)).toEqual([
    'Did you know? Hooks on turn.complete hold the turn open.',
    'Did you know? A pane opened unasked only seats on a wide terminal.',
  ])

  // With no heads-up to show, the band carries the newest one.
  const band = await $.ui.mount({ plugin: 'hud', surface: 'terminal', ...BAND })
  expect(await band.find({ text: /Did you know\? Hooks on turn\.complete hold the turn open\./ })).toBeDefined()
})

test('the banner runs while a turn works, then eases back to rest', async ($, on) => {
  const clock = mock.clock(on, { now: 9_500_000 })
  const w = world(FIRST)
  machine(on, w)

  const ui = await $.ui.mount({ plugin: 'hud', surface: 'terminal', ...PANE })
  const rest = (await ui.find({ type: 'Raster' }))?.props['cells']
  expect(w.blits).toHaveLength(0)

  await $.turn.start({ text: 'go', turnId: 'turn-1' })
  await clock.advance(900)
  const frames = w.blits.length
  expect(frames).toBeGreaterThan(5)
  expect(new Set(w.blits).size).toBe(frames)

  await $.turn.complete({ ...ended('Half a thought'), isAborted: true, reason: 'aborted' })
  await clock.advance(6_000)
  expect(w.blits.at(-1)).toBe(rest)
  const settled = w.blits.length
  await clock.advance(2_000)
  expect(w.blits).toHaveLength(settled)
})
