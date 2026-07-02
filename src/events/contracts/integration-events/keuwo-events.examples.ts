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

export const EVENT_TOPICS = {
  USER_REGISTERED: 'auth.user_registered.v1',
  LISTING_CREATED: 'listings.listing_created.v1',
  LISTING_PUBLISHED: 'listings.listing_published.v1',
  VISIT_SCHEDULED: 'visits.visit_scheduled.v1',
  DOCUMENT_UPLOADED: 'documents.document_uploaded.v1',
  PAYMENT_CONFIRMED: 'payments.payment_confirmed.v1',
  CONTRACT_SIGNED: 'contracts.contract_signed.v1',
  NOTIFICATION_DISPATCHED: 'notifications.notification_dispatched.v1',
} as const;
