# Services Page Overrides

> **PROJECT:** PulseOps
> **Updated:** 2026-08-10
> **Page Type:** Status monitoring workspace

Rules here override the master design system only for Services.

## Information model

- Lead with one semantic banner summarizing the latest state and recent healthy
  check count. Never label degraded checks as uptime.
- Keep every service and environment in one platform-status card. Show current
  state, freshness, the latest 30 real samples, latency, errors, instances, and
  correlated anomaly count without synthesizing missing history.
- Entity name and eye-icon actions open the shared URL-backed service modal;
  external monitoring remains a separate icon action.

## Tracker interaction

- Use emerald for healthy, amber for degraded, red for unhealthy, and slate for
  unknown samples. Always include a visible legend.
- Hover exposes timestamp, state, latency, and errors. Keyboard focus exposes
  the latest sample; arrow keys, Home, and End move through history.
- The tracker is one tab stop with an aggregate accessible label. Do not turn
  each narrow segment into a separate tab stop.

## Responsive behavior

- Desktop rows place identity, history, metrics, and actions on one line.
- Narrow layouts stack those regions in the same order, retain 44px icon
  targets, and keep tracker tooltips within the viewport.
- No tracker, tooltip, metric tile, or legend may introduce horizontal scroll
  at 390px.
