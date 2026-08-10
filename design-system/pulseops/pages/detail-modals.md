# Detail Modal Overrides

> **PROJECT:** PulseOps
> **Updated:** 2026-08-10
> **Applies to:** Builds, tests, services, commits, machines, and agents

## Interaction model

- Entity links from workspaces open a URL-backed modal above the current page.
- Browser Back closes the modal; Forward reopens it. Direct navigation or page
  refresh still renders the canonical full detail route.
- Nested entity links may replace the modal content without discarding the
  underlying workspace context.

## Modal shell

- Desktop: centered, up to 1280px wide and `100dvh - 32px` tall.
- Mobile: edge-to-edge, full-height sheet with no hidden content behind browser
  or application chrome.
- Use a 75% black scrim plus restrained backdrop blur. Keep the modal surface
  opaque OLED slate with a visible border and strong elevation.
- Keep the context bar outside the scroll region. Only detail content scrolls.
- Reserve the root scrollbar gutter while background scrolling is locked. Do
  not also mutate body width or padding: duplicate compensation makes the
  workspace reflow when the modal opens.
- Fade and blur the scrim over 220ms while the surface eases upward 12–16px
  with a subtle scale over 240ms. Dismiss in 160–180ms so closing feels direct.
- Remove transform and transition delays when `prefers-reduced-motion` is set.

## Accessibility

- Use native dialog semantics and focus trapping.
- Move initial focus to the 44px close control; support Escape and backdrop
  dismissal; return the user through browser history.
- Lock background scrolling, expose a unique accessible dialog name, preserve
  visible focus rings, and respect reduced motion.
