# Agent Guide — Keuwo Backend

Real-estate rent/buy platform. NestJS 11 + TypeScript, Drizzle ORM (PostgreSQL), BullMQ (Redis), EventEmitter2 bus, transactional outbox, Resend email, JWT + 2FA auth.

## Quick index

- Detailed always-on index: `.cursor/rules/keuwo-index.mdc`
- Event/outbox conventions: `.cursor/rules/event-driven-outbox.mdc`
- Schema/migration conventions: `.cursor/rules/drizzle-migrations.mdc`
- Deep domain map (lifecycles, enums, analytics pipeline): `.cursor/skills/keuwo-project-map/SKILL.md`
- Feature workflow (endpoint/column/module checklist): `.cursor/skills/keuwo-add-feature/SKILL.md`

## Layout

- `src/modules/` — auth, properties, listings, search, analytics, notifications, users, chat, applications, contracts, documents, payments, visits
- `src/infrastructure/` — database (Drizzle schemas), messaging (outbox), queue (BullMQ + schedulers), redis, storage
- `src/shared/` — domain events (`buildDomainEvent`), pagination helper, ports
- `drizzle/migrations/` — hand-written sequential SQL migrations
- `test/unit`, `test/integration` — jest specs (`*.spec.ts`)

## Verify changes

```bash
npx tsc --noEmit   # typecheck src + tests
npm test           # jest
npm run lint:fix   # eslint + prettier
```

Expected pre-existing noise: 3 lint warnings (seed.ts / socket gateways) and a jest "worker failed to exit" warning.

## Hard rules

- DB writes that emit events must use the outbox inside the same Drizzle transaction (`eventsFactory` pattern).
- Enum-like values live in `domain/*.constants.ts` (`as const` arrays), validated with `@IsIn`; columns are `text`, no PG enums.
- Drizzle `numeric` columns are strings: `String()` on write, `Number()` on read.
- List endpoints are paginated with `buildPaginatedResult()` from `src/shared/application/pagination/pagination.ts`.
- Every schema change ships with an idempotent SQL migration (`NNNN_short_name.sql`) including backfill.
