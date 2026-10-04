// forge-gate's state contract: the phase in force and the evidence for its gate,
// held by the host in $.state so a hot reload keeps it.

/** The forge phase whose branch is checked out, read from wiki/plan.md. */
export type GatePhase = {
  n: number
  title: string
  branch: string
  /** The Verifiable gate's full text. */
  gate: string
  /** The gate's backticked commands that are safe to run unattended. */
  commands: string[]
  /** True when the gate asks for more than its commands prove. */
  hasProse: boolean
  root: string
}

/** One run of one gate command, and the working tree it ran on. */
export type GateRun = {
  command: string
  isOk: boolean
  exitCode?: number
  at: number
  ms?: number
  tail: string
  /** The git tree id of all working files (untracked included) when it ran. */
  tree: string
  by: 'claude' | 'person'
}

/** The person saying a commandless gate's written checks hold on this tree. */
export type GateCheck = {
  at: number
  tree: string
  /** The gate text it was checked against; editing the gate voids it. */
  gate: string
}

declare module 'claude-code' {
  interface PluginState {
    'forge-gate': {
      phase: GatePhase | null
      runs: Record<string, GateRun>
      checked: GateCheck | null
      /** The tree's fingerprint now; '' while an edit may have changed it. */
      tree: string
      isRunning: boolean
    }
  }
}
