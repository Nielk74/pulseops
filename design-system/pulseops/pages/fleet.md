# Fleet Page Overrides

> **PROJECT:** PulseOps
> **Updated:** 2026-08-10
> **Page Type:** Operations dashboard / fleet workspace

Rules here override the master design system only for Fleet operations.

## Layout

- Keep inventory, actions, and audit history in one workspace; render machine
  and agent detail in the shared overlay modal.
- Use a centered 1500px maximum width. At desktop widths, place responsive
  machine cards on the left and a 352px-minimum bulk-actions rail on the right.
  Stack the action rail below cards on smaller screens.
- Keep the visible selection toolbar directly above the machine-card grid.

## Selection and focus

- Card-body activation toggles additive selection; it never clears other cards
  and never scrolls the page. Modifier keys are not required.
- A separate 44px-minimum `Details` control focuses a machine and opens its
  modal. Focus and selection are distinct, visible states.
- Selected cards use the emerald accent and a check icon. The card whose details
  are open also receives a blue focus treatment and `Viewing` label.
- Always expose selected count, `Select all`, and `Clear` controls. Announce both
  selection count and focused machine through a polite live region.
- Persist the focused machine in `machine`, modal state in `detail`, and selected
  IDs in `targets` so refreshes and shared links preserve workspace state.

## Bulk actions

- Keep the bulk-action planner and selection audit trail together in the
  right-side rail, immediately beside the machine grid on desktop.
- The action planner targets the complete selected set and shows machine chips
  before action choice. With no selection, all actions stay unavailable.
- Disable an action when any selected machine is incompatible and state the
  number of incompatible machines (for example, `1 without reference`).
- Audit history includes actions touching any selected machine and shows each
  action's target count.

## Interaction and accessibility

- Hover may enrich telemetry styling, but all useful information remains visible
  on touch and keyboard input.
- Keep visible focus rings, semantic pressed states, icon-plus-text actions, and
  minimum 44px touch targets. Respect reduced motion.
- Use 200ms color, border, and elevation transitions; avoid layout-shifting
  animations and horizontal overflow at 390px.
- Machine modals use the global focus trap, Escape/backdrop close behavior,
  strong scrim, body scroll lock, and full-screen mobile treatment.
