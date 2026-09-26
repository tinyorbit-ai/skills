# Interface Lessons

Load when the PR changes user-facing flows, forms, pickers, builders, rendered state, copy that promises behaviour, or docs describing a UI.

Field lessons from completed reviews. Each is a proof prompt, not a presumed finding: trace the current PR before raising anything.

- **Composable surfaces can form dead ends.** Signal: optional block unions or a
  pre-flow builder where only one block owns the next action. Proof: enumerate
  zero/one/mixed configurations and show every accepted surface has a live route to
  the promised outcome or a safe fallback.
- **An unblock can discard the required outcome.** Signal: required fields filtered,
  weakened, or made optional. Proof: each required value remains visible, accepted,
  submitted, and persisted; advancing the flow alone proves nothing.
- **Queued UI work can capture stale render state.** Signal: delayed callbacks read
  async query data or snapshots. Proof: invoke before and after data arrival and
  assert the final rendered and persisted result, including production scheduling
  semantics when they differ.
- **Interaction claims need an interaction chain.** Signal: copy promises change,
  edit, choose, or picker behavior. Proof: map the claim through an accessible control,
  state mutation, outbound payload, execution input, and focused test.
- **Scope expansion invalidates settled documentation.** Signal: one variant becomes
  many while changed docs retain narrow words such as "only". Proof: re-check every
  modified claim against the final type-by-entry-point matrix.
- **Text matches do not identify the requested journey.** Signal: sibling templates
  or flows share the same copy. Proof: map the source request to its exact runtime
  type, producer, configured inputs, and template before judging the changed cohort.
- **A marker is not a visible outcome.** Signal: history is revealed, ascending sort,
  current/selected highlighting, or a bounded viewport. Proof: overflow the surface
  and show the current item is initially visible or programmatically reached.
- **A fallback can be hidden by its own container.** Signal: `hidden md:*`, headless
  controls returning `null`, shared header atoms, or a layout guard wrapping the mobile
  fallback. Proof: trace rendered visibility through every ancestor at each breakpoint
  and prove one visible, keyboard-reachable control exists in every cell.
- **A visual refactor must preserve zero-result feedback.** Signal: `return null`
  replacing translated copy, deleted empty-state imports, or broad layout diffs over
  lists. Proof: compare populated, initial-empty, and filter-empty branches against the
  base; every accepted zero state keeps a visible explanation.
- **A deprecated slot can still have live callers.** Signal: a shared layout stops
  rendering a prop while callers keep passing it. Proof: inventory every consumer,
  classify each path as a route change or an in-page state transition, and prove a
  visible control survives on desktop, mobile, and a direct deep link.
- **Hidden from sight is not hidden from the tab order.** Signal: mounted fade wrappers,
  `opacity-0`, or `pointer-events-none` around buttons and links. Proof: test tab order
  and accessibility-tree state in both states; unmount or apply a complete inert
  semantic state while hidden.
- **Error states must compose, not accumulate.** Signal: one form holds several error
  flags or an enum, with early-return validation before the previous result is cleared.
  Proof: transition across failure, edit, invalid retry, valid retry, and success; every
  visible message must describe the latest attempted action.
- **URL state changes the list without calling your handler.** Signal: `useSearchParams`
  or a URL-backed list hook beside local selection and cursor state, especially with
  debounced commits. Proof: exercise direct links, reload, back/forward, and selection
  during debounce; every committed query-signature change must invalidate cursor and
  selection.
- **A deep link must pass the destination's own entry policy.** Signal: query parameters
  that call a shared selection setter, cached provider state, async list resolution, or
  a destination with `shouldShow*` predicates. Proof: run the source-action, permission,
  provider-state, and history/manual-choice cells with real providers; stale selections
  clear before render and manual intent cancels a pending link.
- **A guard that deregisters itself may never come back.** Signal: a handler calls `off`
  from its clean branch, or a form library mutates dirty state in place without changing
  the effect dependency. Proof: run clean navigation, then a later edit, then
  cancel/continue; one listener must stay registered until unmount and read current
  state.
- **Displayed identity and gating policy must read the same object.** Signal:
  `modified* ?? original*` display logic beside guards that still read the original, in
  amendment, substitution, or optimistic-update flows. Proof: run original-true with
  replacement-false and the inverse; every policy-bearing element reads the effective
  object.
