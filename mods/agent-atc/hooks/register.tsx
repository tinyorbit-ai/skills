import { atom, read, update } from 'claude-code'
import type { AgentInfo, EngineInterface, Register } from 'claude-code'

import type { AtcAgent, AtcMain, AtcStep, AtcStepState } from '../types'

const PANE = 'agent-atc'
const TITLE = 'Agents'
const POLL_MS = 3_000
// A running agent with no tool call for this long is drawn as quiet: stuck on
// a permission prompt, a long command, or thinking hard.
const QUIET_MS = 90_000
// Only the last few are drawn; every subagent tool call copies what is kept.
const STEPS_KEPT = 12
const AGENTS_KEPT = 60

type Agents = Record<string, AtcAgent>
type Row = { agent: AtcAgent; depth: number }

const agents = atom({ plugin: 'agent-atc', key: 'agents' } as const, {})
const selected = atom({ plugin: 'agent-atc', key: 'selected' } as const, null)
const now = atom({ plugin: 'agent-atc', key: 'now' } as const, 0)
const main = atom({ plugin: 'agent-atc', key: 'main' } as const, { lastAt: 0, calls: 0 })

// The task statuses that mean an agent has stopped for good. Any other one is live:
// running, pending, or waiting on a background shell of its own.
const ENDED = new Set(['completed', 'failed', 'killed', 'stopped', 'cancelled', 'canceled', 'error'])
const isLive = (status: string): boolean => !ENDED.has(status)
// Live and doing something: an idle teammate is waiting for a message, not running.
const isBusy = (status: string): boolean => isLive(status) && status !== 'idle'

const oneLine = (text: string, max = 80): string => {
  const line = text.replace(/\s+/g, ' ').trim()
  return line.length > max ? `${line.slice(0, max - 1)}…` : line
}

const shortPath = (path: string): string => path.split('/').filter(Boolean).slice(-2).join('/')

const DETAIL_KEYS = ['command', 'file_path', 'notebook_path', 'pattern', 'description', 'url', 'query', 'skill', 'path', 'prompt']

// What a trail line says about a call: the one input field a person would
// recognise it by, whatever the tool.
const detailOf = (input: Record<string, unknown>): string => {
  for (const key of DETAIL_KEYS) {
    const value = input[key]
    if (typeof value === 'string' && value.trim() !== '') {
      return key.endsWith('path') ? shortPath(value) : oneLine(value)
    }
  }
  return ''
}

const ago = (ms: number): string => {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`
}

const clockTime = (at: number): string => new Date(at).toTimeString().slice(0, 8)

const kTokens = (tokens: number): string =>
  tokens < 1000 ? `${tokens} tok` : `${Math.round(tokens / 1000)}k tok`

const shortModel = (model: string | undefined): string | undefined => model?.replace(/^claude-/, '')

const blank = (id: string, at: number): AtcAgent => ({
  id,
  label: id.slice(0, 8),
  type: 'agent',
  status: 'running',
  startedAt: at,
  lastAt: at,
  calls: 0,
  errors: 0,
  steps: [],
})

// Keeps the newest agents, and every live one however old.
const capped = (all: Agents): Agents => {
  const list = Object.values(all)
  if (list.length <= AGENTS_KEPT) return all
  const kept = [...list]
    .sort((a, b) => b.startedAt - a.startedAt)
    .filter((agent, i) => i < AGENTS_KEPT || isLive(agent.status))
  return Object.fromEntries(kept.map(agent => [agent.id, agent]))
}

const withStep = (all: Agents, id: string, step: AtcStep): Agents => {
  const agent = all[id] ?? blank(id, step.at)
  return capped({
    ...all,
    [id]: {
      ...agent,
      status: isLive(agent.status) ? agent.status : 'running',
      lastAt: step.at,
      calls: agent.calls + 1,
      steps: [...agent.steps, step].slice(-STEPS_KEPT),
    },
  })
}

const withStepEnded = (all: Agents, id: string, stepId: string, state: AtcStepState, at: number): Agents => {
  const agent = all[id]
  if (agent === undefined) return all
  return {
    ...all,
    [id]: {
      ...agent,
      lastAt: at,
      errors: agent.errors + (state === 'err' ? 1 : 0),
      steps: agent.steps.map(step => (step.id === stepId ? { ...step, state } : step)),
    },
  }
}

// The engine's list is the truth for status (it alone knows `killed`) and
// for agents started before this module loaded. Undefined when nothing moved.
const reconciled = (all: Agents, listed: readonly AgentInfo[], at: number): Agents | undefined => {
  let hasMoved = false
  const next = { ...all }
  for (const info of listed) {
    const agent = next[info.id]
    // Past the cap, an ended agent the map dropped stays dropped, or every poll would
    // re-add it as new and push out another.
    if (agent === undefined && !isLive(info.status) && Object.keys(next).length >= AGENTS_KEPT) continue
    if (agent === undefined) {
      next[info.id] = {
        ...blank(info.id, at),
        label: oneLine(info.description, 60) || info.id.slice(0, 8),
        type: info.type,
        name: info.name,
        teammateId: info.teammateId,
        parentId: info.parentId,
        status: info.status,
      }
      hasMoved = true
    } else if (agent.type === 'agent' && info.type !== 'agent') {
      // First seen through a tool call, before the list: fill in what it really is.
      next[info.id] = {
        ...agent,
        label: oneLine(info.description, 60) || agent.label,
        type: info.type,
        name: agent.name ?? info.name,
        teammateId: agent.teammateId ?? info.teammateId,
        parentId: agent.parentId ?? info.parentId,
        status: info.status,
      }
      hasMoved = true
    } else if (agent.status !== info.status) {
      next[info.id] = {
        ...agent,
        status: info.status,
        endedAt: isLive(info.status) ? undefined : (agent.endedAt ?? at),
      }
      hasMoved = true
    }
  }
  return hasMoved ? capped(next) : undefined
}

const treeOrder = (list: readonly AtcAgent[]): Row[] => {
  const ids = new Set(list.map(agent => agent.id))
  const children = new Map<string | undefined, AtcAgent[]>()
  for (const agent of list) {
    const parent = agent.parentId !== undefined && ids.has(agent.parentId) ? agent.parentId : undefined
    children.set(parent, [...(children.get(parent) ?? []), agent])
  }
  const rows: Row[] = []
  const walk = (parent: string | undefined, depth: number): void => {
    if (depth > 8) return
    for (const agent of [...(children.get(parent) ?? [])].sort((a, b) => a.startedAt - b.startedAt)) {
      rows.push({ agent, depth })
      walk(agent.id, depth + 1)
    }
  }
  walk(undefined, 0)
  return rows
}

const look = (agent: AtcAgent, at: number): { glyph: string; color: string; word: string } => {
  if (agent.status === 'waiting') {
    return { glyph: '◐', color: 'cyan', word: `waiting ${ago(at - agent.lastAt)}` }
  }
  if (agent.status === 'idle') {
    return { glyph: '○', color: 'cyan', word: `idle ${ago(at - agent.lastAt)}` }
  }
  if (isLive(agent.status)) {
    const idle = at - agent.lastAt
    return idle > QUIET_MS
      ? { glyph: '◐', color: 'yellow', word: `quiet ${ago(idle)}` }
      : { glyph: '●', color: 'green', word: `running ${ago(at - agent.startedAt)}` }
  }
  const took = ago((agent.endedAt ?? agent.lastAt) - agent.startedAt)
  if (agent.status === 'completed') return { glyph: '✓', color: 'gray', word: `done in ${took}` }
  if (agent.status === 'failed') return { glyph: '✗', color: 'red', word: `failed after ${took}` }
  return { glyph: '■', color: 'red', word: `${agent.status} after ${took}` }
}

const STEP_MARK: Record<AtcStepState, string> = { run: '…', ok: '✓', err: '✗', deny: '⊘' }

const stepLine = (step: AtcStep): string => `${step.tool} ${step.detail}`.trim()

let shownStatus: string | undefined

const showStatus = ($: EngineInterface, all: Agents): void => {
  const live = Object.values(all).filter(agent => isBusy(agent.status)).length
  const text = live > 0 ? `${live} running · /atc` : undefined
  if (text !== shownStatus) {
    shownStatus = text
    $.ui.status(text)
  }
}

const sync = async ($: EngineInterface): Promise<void> => {
  const [listed, at, all] = await Promise.all([$.agent.list(), $.clock.now(), read($, agents)])
  const merged = reconciled(all, listed, at)
  if (merged !== undefined) {
    await update($, agents, current => reconciled(current, listed, at) ?? current)
  }
  const latest = merged ?? all
  showStatus($, latest)
  // Redraws the pane while something runs, so ages and quiet marks move.
  if (Object.values(latest).some(agent => isBusy(agent.status))) {
    await update($, now, () => at)
  }
}

export const register: Register = (on, options) => {
  const isAutoOpen = options['autoOpen'] !== false
  let isDismissed = false
  let hasAutoOpened = false
  // Set from any terminal drawing: whether a pane would dock as a sidebar. On the
  // main screen it opens inline above the prompt, which is no place to open unasked.
  let isDocking = false

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'atc',
      description: 'Open the agent control pane (/atc close to close it)',
    })
    $.clock.every(POLL_MS, () => {
      sync($).catch(() => undefined)
    })
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      await update($, agents, () => ({}))
      await update($, selected, () => null)
      await update($, main, () => ({ lastAt: 0, calls: 0 }))
      showStatus($, {})
    }
    return next(e)
  })

  on('command.run', { command: 'atc' }, async ($, e) => {
    if (e.args.trim() === 'close') {
      isDismissed = true
      await $.ui.close({ id: PANE })
      return { text: 'Agent control closed.' }
    }
    isDismissed = false
    const opened = await $.ui.open({ id: PANE, title: TITLE, focus: true })
    return {
      text: opened.isPlaced
        ? 'Agent control open. Esc gives the keyboard back; /atc close closes it.'
        : `Agent control is waiting for room: ${opened.reason}`,
    }
  })

  on('ui.close', ($, e, next) => {
    if (e.id === PANE && e.origin.kind === 'person') isDismissed = true
    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const ran = await next(e)
    const id = ran.agentId
    if (id === undefined) return ran

    const at = await $.clock.now()
    await update($, agents, all => {
      const agent = all[id] ?? blank(id, at)
      return capped({
        ...all,
        [id]: {
          ...agent,
          label: oneLine(e.description, 60) || agent.label,
          type: e.subagentType,
          model: ran.model,
          name: e.name,
          teammateId: ran.teammateId,
          parentId: e.parentAgentId,
          status: 'running',
          startedAt: Math.min(agent.startedAt, at),
        },
      })
    })
    showStatus($, await read($, agents))

    // Opened unasked, the engine seats it only on a wide terminal.
    if (isAutoOpen && isDocking && !isDismissed && !hasAutoOpened) {
      hasAutoOpened = true
      $.ui.open({ id: PANE, title: TITLE }).catch(() => undefined)
    }
    return ran
  })

  on('tool.call', async ($, e, next) => {
    const at = await $.clock.now()
    const step: AtcStep = {
      id: e.tool_use_id ?? `${at}-${String(e.tool)}`,
      at,
      tool: String(e.tool),
      detail: detailOf(e as unknown as Record<string, unknown>),
      state: 'run',
    }
    const agentId = e.agentId
    if (agentId === undefined) {
      await update($, main, top => ({ lastAt: at, calls: top.calls + 1, step }))
    } else {
      await update($, agents, all => withStep(all, agentId, step))
    }

    let state: AtcStepState = 'err'
    try {
      const ran = await next(e)
      state = ran.deny !== undefined ? 'deny' : ran.isError === true ? 'err' : 'ok'
      return ran
    } finally {
      const end = await $.clock.now()
      if (agentId === undefined) {
        await update($, main, top =>
          top.step?.id === step.id ? { ...top, lastAt: end, step: { ...step, state } } : top,
        )
      } else {
        await update($, agents, all => withStepEnded(all, agentId, step.id, state, end))
      }
    }
  })

  on('turn.complete', async ($, e, next) => {
    const agentId = e.agentId
    if (agentId !== undefined) {
      const at = await $.clock.now()
      const usage = e.usage
      const tokens =
        usage === undefined
          ? undefined
          : usage.input_tokens + usage.output_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens
      const status = e.reason === 'answer' ? 'completed' : e.reason === 'aborted' ? 'stopped' : 'failed'
      await update($, agents, all => {
        const agent = all[agentId]
        if (agent === undefined) return all
        return {
          ...all,
          [agentId]: {
            ...agent,
            status,
            endedAt: at,
            lastAt: at,
            answer: e.answer.trim() === '' ? agent.answer : oneLine(e.answer, 200),
            tokens: tokens === undefined ? agent.tokens : (agent.tokens ?? 0) + tokens,
          },
        }
      })
      showStatus($, await read($, agents))
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    if (e.surface === 'terminal') isDocking = e.viewport?.isFullscreen === true
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const Input = 'Input' in ui ? ui.Input : undefined

    const [all, picked, , top, at] = await Promise.all([
      read($, agents),
      read($, selected),
      read($, now),
      read($, main),
      $.clock.now(),
    ])
    const width = Math.max(30, e.props.bodyColumns)
    const rows = treeOrder(Object.values(all))
    const live = rows.filter(row => isBusy(row.agent.status)).length
    const done = rows.filter(row => row.agent.status === 'completed').length
    const other = rows.filter(row => !isLive(row.agent.status) && row.agent.status !== 'completed').length
    const focusId = picked ?? e.props.view.agentId ?? null
    const focus = focusId === null ? undefined : all[focusId]

    const pick = (id: string) => () => {
      void update($, selected, current => (current === id ? null : id))
    }

    const send = (agent: AtcAgent) => async (text: string) => {
      const message = text.trim()
      if (message === '') return
      const sent = await $.session.send({ to: { agentId: agent.id }, text: message })
      $.ui.toast(sent.isDelivered ? `Sent to ${agent.label}` : `Not sent: ${sent.reason}`)
    }

    const stop = (agent: AtcAgent) => async () => {
      const ran = await $.tool.call({
        tool: 'TaskStop',
        task_id: agent.teammateId ?? agent.id,
        consent: `The user pressed "Stop" on agent ${agent.label} in the agent control pane.`,
      })
      if (ran.deny !== undefined) $.ui.toast(`Not stopped: ${ran.deny}`)
      else if (ran.isError === true) $.ui.toast(`Not stopped: ${ran.text}`)
      else $.ui.toast(`Stopped ${agent.label}`)
    }

    return (
      <Box flexDirection="column" width={width}>
        <Text bold wrap="truncate-end">
          {rows.length === 0
            ? 'No subagents yet'
            : `${live} running · ${done} done${other > 0 ? ` · ${other} stopped or failed` : ''}`}
        </Text>
        {top.step !== undefined && (
          <Text dimColor wrap="truncate-end">
            main: {STEP_MARK[top.step.state]} {stepLine(top.step)} · {ago(at - top.lastAt)} ago
          </Text>
        )}
        <Text dimColor>{'─'.repeat(width)}</Text>

        {rows.length === 0 && (
          <Text dimColor wrap="wrap">
            Each subagent shows here the moment it starts, with what it is doing now.
          </Text>
        )}
        {rows.map(({ agent, depth }, i) => {
          const { glyph, color, word } = look(agent, at)
          const last = agent.steps[agent.steps.length - 1]
          return (
            <Box key={`row-${agent.id}`} flexDirection="row">
              <Text color={color}>
                {'  '.repeat(depth)}
                {agent.id === focusId ? '›' : ' '}
                {glyph}{' '}
              </Text>
              <Button
                key={`pick-${agent.id}`}
                plain
                hotkey={i < 9 ? String(i + 1) : undefined}
                label={agent.name ?? agent.label}
                onPress={pick(agent.id)}
              />
              <Text dimColor wrap="truncate-end">
                {'  '}
                {word}
                {isLive(agent.status) && last !== undefined ? `  ${stepLine(last)}` : ''}
              </Text>
            </Box>
          )
        })}

        {focus !== undefined && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold wrap="truncate-end">
              {focus.name ?? focus.label}
            </Text>
            <Text dimColor wrap="truncate-end">
              {[
                focus.type,
                shortModel(focus.model),
                `started ${clockTime(focus.startedAt)}`,
                `${focus.calls} calls`,
                focus.errors > 0 ? `${focus.errors} errors` : undefined,
                focus.tokens !== undefined ? kTokens(focus.tokens) : undefined,
              ]
                .filter(part => part !== undefined)
                .join(' · ')}
            </Text>
            {focus.name !== undefined && (
              <Text dimColor wrap="truncate-end">
                {focus.label}
              </Text>
            )}
            {focus.steps.map(step => (
              <Box key={`step-${step.id}`} flexDirection="row">
                <Text dimColor>{clockTime(step.at)} </Text>
                <Text color={step.state === 'err' || step.state === 'deny' ? 'red' : undefined}>
                  {STEP_MARK[step.state]}{' '}
                </Text>
                <Text wrap="truncate-end">{stepLine(step)}</Text>
              </Box>
            ))}
            {focus.steps.length === 0 && <Text dimColor>No tool calls yet.</Text>}
            {focus.answer !== undefined && !isLive(focus.status) && (
              <Text wrap="wrap">Answer: {focus.answer}</Text>
            )}
            {Input !== undefined && (
              <Input
                key={`msg-${focus.id}`}
                placeholder={isLive(focus.status) ? 'Message this agent…' : 'Ask it a follow-up…'}
                submitLabel="Send"
                onSubmit={send(focus)}
              />
            )}
            <Box flexDirection="row" gap={1}>
              {isLive(focus.status) && (
                <Button key="stop" label="Stop" onPress={stop(focus)} />
              )}
              {picked !== null && (
                <Button key="back" label="Back" hotkey="b" onPress={() => void update($, selected, () => null)} />
              )}
            </Box>
          </Box>
        )}

        {rows.length > 0 && (
          <Text dimColor wrap="truncate-end">
            {'\n'}1-9 picks an agent · Tab walks the controls · Esc gives the keyboard back
          </Text>
        )}
      </Box>
    )
  })
}
