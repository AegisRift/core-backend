---
name: keuwo-add-feature
description: Step-by-step workflow to add a new endpoint, field or module to the Keuwo backend following its DTO/service/repository/outbox conventions. Use when adding features, endpoints, columns, domain events, or new modules to keuwo-backend.
---

# Adding a Feature to Keuwo Backend

## Checklist

```
- [ ] 1. Domain constants (if new enum values)
- [ ] 2. Drizzle schema + SQL migration
- [ ] 3. DTOs with validation
- [ ] 4. Repository (transaction + eventsFactory)
- [ ] 5. Service (build domain events)
- [ ] 6. Controller + module wiring
- [ ] 7. Analytics hook (if event matters for recommendations)
- [ ] 8. Tests + verification
```

## Steps

**1. Domain constants** — enum-like values go in `src/modules/<module>/domain/<module>.constants.ts` as `as const` arrays with derived union types. DTOs validate with `@IsIn(CONSTANT, { each: true })`.

**2. Schema + migration** — edit `src/infrastructure/database/drizzle/schema/*.schema.ts`, then create `drizzle/migrations/NNNN_short_name.sql` (next sequential number). Use `IF NOT EXISTS` + backfill `UPDATE`s. Index new filterable columns.

**3. DTOs** — in `src/modules/<module>/api/http/dto/`. Global ValidationPipe has transform+whitelist. Query params need `@Type(() => Number)` for numbers and explicit `@Transform` for booleans (`'false'` would coerce to `true` otherwise). Conditional required fields use `@ValidateIf`.

**4. Repository** — writes that emit events follow the transactional outbox pattern:

```typescript
async create(input: CreateXInput, eventsFactory?: (row: XRow) => DomainEvent[]) {
  return this.drizzle.db.transaction(async (tx) => {
    const [row] = await tx.insert(xTable).values({...}).returning();
    for (const event of eventsFactory?.(row) ?? []) {
      await this.outbox.add(event, tx);
    }
    return row;
  });
}
```

Remember: `numeric` columns need `String(value)` on write.

**5. Service** — builds events with `buildDomainEvent({ eventType: EVENT_TOPICS.X, aggregateId, payload })`. Add new topics to `EVENT_TOPICS` as `domain.event_name.v1`. Payloads carry denormalized context (price, country, city, dealType, etc.).

**6. Controller/module** — controllers are thin, delegate to the service. Register controller/service/repository in the module's `@Module`. Paginated list endpoints must return `buildPaginatedResult()` from `@shared/application/pagination/pagination`.

**7. Analytics hook** — if the event should feed recommendations: subscribe in `src/modules/analytics/application/behavior-events.consumer.ts` and extend `computeUserInsights` in `insights.aggregator.ts`.

**8. Tests + verification** — update mocks in `test/integration/real-estate-simulated-flow.spec.ts` when repository signatures change; add/extend unit specs in `test/unit/`. Then run:

```bash
npx tsc --noEmit
npm test
npm run lint:fix
```

All three must be clean (3 pre-existing lint warnings and the jest "worker failed to exit" warning are expected noise).
