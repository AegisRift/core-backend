import { IntegrationEvent } from './integration-event.contract';

export type UserRegisteredEvent = IntegrationEvent<{
  userId: string;
  email: string;
}>;

export type ListingCreatedEvent = IntegrationEvent<{
  listingId: string;
  propertyId: string;
  price: number;
}>;

export type VisitScheduledEvent = IntegrationEvent<{
  visitId: string;
  listingId: string;
  date: string;
}>;

export type SearchPerformedEvent = IntegrationEvent<{
  userId?: string;
  queryText?: string;
  filters: Record<string, unknown>;
  resultsCount: number;
}>;

export type ListingInteractionEvent = IntegrationEvent<{
  listingId: string;
  propertyId: string;
  interactionType: 'view' | 'save' | 'lead' | 'visit_scheduled' | 'application' | 'chat_message';
  actorUserId?: string;
  source?: string;
  context?: Record<string, unknown>;
}>;

export const EVENT_TOPICS = {
  USER_REGISTERED: 'auth.user_registered.v1',
  PROPERTY_CREATED: 'properties.property_created.v1',
  PROPERTY_PUBLISHED: 'properties.property_published.v1',
  PROPERTY_AVAILABILITY_CHANGED: 'properties.property_availability_changed.v1',
  PROPERTY_VISIT_REGISTERED: 'properties.property_visit_registered.v1',
  LISTING_CREATED: 'listings.listing_created.v1',
  LISTING_PUBLISHED: 'listings.listing_published.v1',
  LISTING_STATUS_CHANGED: 'listings.listing_status_changed.v1',
  LISTING_INTERACTION: 'listings.listing_interaction.v1',
  SEARCH_PERFORMED: 'search.search_performed.v1',
  USER_INSIGHTS_UPDATED: 'analytics.user_insights_updated.v1',
  VISIT_SCHEDULED: 'visits.visit_scheduled.v1',
  DOCUMENT_UPLOADED: 'documents.document_uploaded.v1',
  PAYMENT_CONFIRMED: 'payments.payment_confirmed.v1',
  CONTRACT_SIGNED: 'contracts.contract_signed.v1',
  NOTIFICATION_DISPATCHED: 'notifications.notification_dispatched.v1',
} as const;
