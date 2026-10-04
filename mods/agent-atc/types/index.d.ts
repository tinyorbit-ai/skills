// agent-atc's state contract: every value the pane draws from, held by the
// host in $.state so a hot reload keeps it.

export type AtcStepState = 'run' | 'ok' | 'err' | 'deny'

/** One tool call an agent made, as the trail shows it. */
export type AtcStep = {
  id: string
  at: number
  tool: string
  detail: string
  state: AtcStepState
}

/** One subagent of the session. */
export type AtcAgent = {
  id: string
  label: string
  type: string
  model?: string
  name?: string
  /** What TaskStop takes for a teammate, whose loop id it refuses. */
  teammateId?: string
  parentId?: string
  /** The engine's task status (`running`, `completed`, `failed`, `killed`, ...). */
  status: string
  startedAt: number
  lastAt: number
  endedAt?: number
  calls: number
  errors: number
  tokens?: number
  /** First line of the agent's last answer. */
  answer?: string
  steps: AtcStep[]
}

/** The main loop's latest tool call, for the header line. */
export type AtcMain = {
  lastAt: number
  calls: number
  step?: AtcStep
}

declare module 'claude-code' {
  interface PluginState {
    'agent-atc': {
      agents: Record<string, AtcAgent>
      selected: string | null
      now: number
      main: AtcMain
    }
  }
}
