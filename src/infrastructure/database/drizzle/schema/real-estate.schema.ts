import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const properties = pgTable(
  'properties',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    advertiserUserId: text('advertiser_user_id').notNull(),
    developerName: text('developer_name'),
    complexName: text('complex_name'),
    operationType: text('operation_type').notNull(), // rent | buy
    rentPeriod: text('rent_period'), // short | long | indefinite
    areaM2: numeric('area_m2', { precision: 10, scale: 2 }).notNull(),
    bedrooms: integer('bedrooms').notNull().default(0),
    bathrooms: integer('bathrooms').notNull().default(0),
    amenities: jsonb('amenities').notNull().default([]),
    photos: jsonb('photos').notNull().default([]), // [{url, category}]
    description: text('description').notNull(),
    cost: numeric('cost', { precision: 14, scale: 2 }).notNull(),
    requirements: jsonb('requirements').notNull().default([]),
    availability: text('availability').notNull().default('available'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    nearbyPoints: jsonb('nearby_points').notNull().default([]),
    mapLocation: jsonb('map_location').notNull().default({}),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_properties_advertiser').on(table.advertiserUserId),
    index('idx_properties_availability').on(table.availability),
    index('idx_properties_operation').on(table.operationType),
  ],
);

export const propertyAvailabilityAudit = pgTable(
  'property_availability_audit',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    propertyId: uuid('property_id').notNull(),
    changedByUserId: text('changed_by_user_id').notNull(),
    fromStatus: text('from_status').notNull(),
    toStatus: text('to_status').notNull(),
    reason: text('reason').notNull(),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_property_availability_audit_property').on(table.propertyId)],
);

export const propertyVisits = pgTable(
  'property_visits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    propertyId: uuid('property_id').notNull(),
    userId: text('user_id').notNull(),
    visitedAt: timestamp('visited_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_property_visits_property').on(table.propertyId),
    index('idx_property_visits_user').on(table.userId),
  ],
);

export const listings = pgTable(
  'listings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    propertyId: uuid('property_id').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    status: text('status').notNull().default('available'), // available | paused
    price: numeric('price', { precision: 14, scale: 2 }).notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
    viewsCount: integer('views_count').notNull().default(0),
    savesCount: integer('saves_count').notNull().default(0),
    leadsCount: integer('leads_count').notNull().default(0),
    visitsScheduledCount: integer('visits_scheduled_count').notNull().default(0),
    applicationsCount: integer('applications_count').notNull().default(0),
    chatMessagesCount: integer('chat_messages_count').notNull().default(0),
    lastInteractionAt: timestamp('last_interaction_at', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_listings_property').on(table.propertyId),
    index('idx_listings_status').on(table.status),
  ],
);

export const listingAnalyticsEvents = pgTable(
  'listing_analytics_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id').notNull(),
    eventType: text('event_type').notNull(), // view | save | lead | visit_scheduled | application | chat_message
    value: integer('value').notNull().default(1),
    actorUserId: text('actor_user_id'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb('metadata').notNull().default({}),
  },
  (table) => [
    index('idx_listing_analytics_events_listing').on(table.listingId),
    index('idx_listing_analytics_events_type').on(table.eventType),
  ],
);

export const listingSearchHistory = pgTable(
  'listing_search_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    queryText: text('query_text'),
    operationType: text('operation_type'),
    minPrice: numeric('min_price', { precision: 14, scale: 2 }),
    maxPrice: numeric('max_price', { precision: 14, scale: 2 }),
    country: text('country'),
    city: text('city'),
    distanceRangeKm: numeric('distance_range_km', { precision: 10, scale: 2 }),
    userLat: numeric('user_lat', { precision: 10, scale: 7 }),
    userLng: numeric('user_lng', { precision: 10, scale: 7 }),
    bedrooms: integer('bedrooms'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_listing_search_history_user').on(table.userId),
    index('idx_listing_search_history_created').on(table.createdAt),
  ],
);
