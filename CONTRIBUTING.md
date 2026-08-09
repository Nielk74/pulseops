# Contributing

## Development workflow

1. Install Node.js 22 or newer.
2. Run `npm install`.
3. Run `npm run db:migrate` and `npm run db:seed`.
4. Develop with `npm run dev`.
5. Before opening a pull request, run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Engineering rules

- Keep SQLite as the only application database until measurements prove it is
  insufficient.
- Prefer polling and short idempotent writes over message infrastructure.
- Add both live and mock behavior when introducing a source capability.
- Preserve data freshness and connector-error visibility.
- Store structured evidence, not full external logs or artifact binaries.
- Keep correlation deterministic and explainable.
- Never add a generic command-execution route.
- Make action workflows typed, plan-first, role-checked, and auditable.
- Use Git commits—not pull requests—as the source-change unit.

Update `PROGRESS.md` when a milestone or architectural decision changes.
