import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Raw behavioral events per user. Fed by the internal event bus consumers and
 * used as the source for aggregated insights (and, later, the external
 * recommendations/feed service).
 */
export const userBehaviorEvents = pgTable(
  'user_behavior_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    eventType: text('event_type').notNull(), // search_performed | listing_interaction | property_visit | ...
    entityType: text('entity_type').notNull(), // listing | property | search
    entityId: text('entity_id'),
    payload: jsonb('payload').notNull().default({}),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_user_behavior_events_user').on(table.userId),
    index('idx_user_behavior_events_type').on(table.eventType),
    index('idx_user_behavior_events_occurred').on(table.occurredAt),
  ],
);

/**
 * Aggregated per-user features. This is the contract the recommendations/feed
 * service consumes to score and rank listings for a user.
 */
export const userBehaviorInsights = pgTable(
  'user_behavior_insights',
  {
    userId: text('user_id').primaryKey(),
    preferredOperationType: text('preferred_operation_type'), // rent | buy
    minPriceObserved: text('min_price_observed'),
    maxPriceObserved: text('max_price_observed'),
    avgPriceObserved: text('avg_price_observed'),
    topCountries: jsonb('top_countries').notNull().default([]),
    topCities: jsonb('top_cities').notNull().default([]),
    topAmenities: jsonb('top_amenities').notNull().default([]),
    searchCount: integer('search_count').notNull().default(0),
    viewCount: integer('view_count').notNull().default(0),
    saveCount: integer('save_count').notNull().default(0),
    leadCount: integer('lead_count').notNull().default(0),
    engagement: jsonb('engagement').notNull().default({}),
    features: jsonb('features').notNull().default({}),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_user_behavior_insights_updated').on(table.updatedAt)],
);
