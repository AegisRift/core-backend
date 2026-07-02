---
name: keuwo-project-map
description: Deep domain and architecture map of the Keuwo real-estate backend - lifecycles, enums, event pipeline, search filters, analytics insights. Use when working on properties, listings, search, analytics, the outbox, migrations, or when needing to locate where a behavior is implemented.
---

# Keuwo Project Map

## Domain model

### Property (`properties` table)

- Lifecycle: `draft` → `published` → `archived`. Created as `draft`; only published properties (and drafts owned by the viewer) are visible.
- Availability: `unavailable | available_soon | available_on_date | available`. When `available_on_date`, `availableFromDate` (real column, timestamptz) is required — enforced with `@ValidateIf` in `CreatePropertyDto` and `ChangePropertyAvailabilityDto`. Availability changes are audited in `property_availability_audit`.
- `bathrooms` numeric(4,1) supports half baths (validate `@IsDivisibleBy(0.5)`), `furnished` boolean (first-class field, NOT an amenity), `developerId` links to developer/construction company, `amenities` is `PropertyAmenity[]` (enum catalog in `src/modules/properties/domain/property.constants.ts`, ~30 values).
- Visits recorded in `property_visits` via `POST /properties/:id/visits`.

### Listing (`listings` table)

- Lifecycle: `draft` → `published` → `paused` → `closed`. Publishing requires the parent property to be published.
- `dealType`: `direct_owner | owner_administrator | real_estate_agency | developer` (`src/modules/listings/domain/listing.constants.ts`). Required on create.
- Interaction counters on the row (viewsCount, savesCount, leadsCount…), raw events in `listing_analytics_events`. Interactions tracked via `POST /listings/:id/events` and automatic view tracking in `findById` when a viewer is present.

### Search

- `GET /search/listings` with `SearchListingsQueryDto`: q (FTS + ILIKE), operationType, dealType, developerId, furnished, rentPeriod, min/maxPrice, bedrooms, bathrooms, min/maxAreaM2, country/city (JSONB), amenities (comma-separated → array), lat/lng/radiusKm (haversine), sortBy, page/pageSize.
- Results and `GET /search/history/:userId` are paginated with `PaginatedResult<T>` (`items,total,page,pageSize,totalPages,hasNextPage,hasPreviousPage`).
- Logged-in searches are stored in `listing_search_history` and emit `search.search_performed.v1`.

### Analytics / recommendations pipeline

1. Services emit events (search_performed, listing interaction, property visit) via outbox/event bus.
2. `BehaviorEventsConsumer` (`@OnEvent`) persists raw rows to `user_behavior_events`.
3. `AnalyticsWorker` (BullMQ, repeatable 60s) runs `computeUserInsights` (`insights.aggregator.ts`) → upserts `user_behavior_insights` (preferred operationType, price ranges, top locations, top amenities, engagement counts).
4. Read API: `GET /analytics/users/:userId/insights` (materialized, falls back to on-demand compute).

## Event system

- `EVENT_TOPICS` in `src/events/contracts/integration-events/keuwo-events.examples.ts`; names are `domain.event_name.v1`.
- `buildDomainEvent()` (`src/shared/domain/events/build-domain-event.ts`) fills eventId/occurredAt/correlationId.
- Outbox: `outbox_events` table; `OutboxRepository.add(event, tx?)` accepts a `DrizzleExecutor` to join the caller's transaction. Relay worker drains it (repeatable job `outbox-relay`, 5s, registered in `src/infrastructure/queue/queue.schedulers.ts`).

## Auth specifics

- `auth_users` includes profile fields (firstName, lastName, country, userType, preferredContactMethod, isEmailVerified…). Login requires verified email.
- `auth_sessions` requires `deviceId` (deviceName/deviceLocation optional). 2FA challenges in `auth_challenges`; sensitive actions guarded by `sensitive-action-2fa.guard.ts` + `@TwoFactorPurpose`.

## Tests

- `test/integration/real-estate-simulated-flow.spec.ts`: full simulated flow (register → property draft/publish → listing draft/publish → search → interactions → outbox relay → insights) using in-memory repository mocks. Update its mocks when repository signatures change.
- Unit specs: `search.service.spec.ts`, `behavior-insights.spec.ts`, `auth.service.spec.ts`, `template-renderer.service.spec.ts`.
- Verification loop after changes: `npx tsc --noEmit` → `npm test` → `npm run lint:fix`.

## Planned infra migration (not yet implemented)

AppSync (replaces Socket.io), RDS PostgreSQL, DynamoDB (trace/audit), ElastiCache Redis, MSK + MSK Connect, DMS (CDC), ECS Flink, self-hosted Sentry on ECS.
