import { DomainEvent } from '../../../../shared/domain/events/domain-event';

export interface ListingPublishedPayload {
  listingId: string;
  publishedAt: string;
}

export type ListingPublishedEvent = DomainEvent<ListingPublishedPayload>;
