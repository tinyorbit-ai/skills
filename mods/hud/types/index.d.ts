// hud's state contract: every value the band and the pane draw from, held by
// the host in $.state so a hot reload keeps it.

/** A question Claude put to the person that has no answer yet. */
export type HudAsk = {
  id: string
  text: string
  at: number
  /** `dialog`: a question dialog the person closed; `reply`: asked in the reply's text. */
  from: 'reply' | 'dialog'
}

/** A question the person asked, with the one-line answer the reply gave. */
export type HudAnswer = {
  id: string
  question: string
  answer: string
  at: number
  /** No reply has answered it yet: the reader is asked about it again each turn. */
  isOpen?: true
}

export type HudLinkKind = 'pr' | 'issue' | 'file' | 'local' | 'deploy' | 'artifact' | 'link'

/** Something the session handed over to open. `href` is as the reply wrote it. */
export type HudLink = {
  id: string
  kind: HudLinkKind
  label: string
  href: string
  at: number
}

/** A background shell the main loop started and that has not ended. */
export type HudJob = {
  id: string
  label: string
  startedAt: number
}

/** Everything the reader fills: one value, so a reading lands in one write. */
export type HudBoard = {
  asks: HudAsk[]
  answers: HudAnswer[]
  links: HudLink[]
  /** Heads-ups of the last turn read: not done, not verified, to watch. */
  notes: string[]
  /** "Did you know" facts about the work, newest first; they outlive their turn. */
  tips: string[]
  next: string | null
}

/** How the last reading of a turn went. */
export type HudReading = {
  state: 'idle' | 'reading' | 'read' | 'failed'
  at: number
  model?: string
  tokens?: number
  reason?: string
}

/** The turn under way: what the person wrote in it, for the reader. */
export type HudTurn = {
  isWorking: boolean
  prompts: string[]
}

export type HudView = {
  isPaneOpen: boolean
  isShowingAll: boolean
}

declare module 'claude-code' {
  interface PluginState {
    hud: {
      board: HudBoard
      jobs: HudJob[]
      reading: HudReading
      turn: HudTurn
      view: HudView
      now: number
    }
  }
}
