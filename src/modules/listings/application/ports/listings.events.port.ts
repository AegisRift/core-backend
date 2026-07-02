import { ListingCreatedEvent } from '../../domain/events/listing-created.event';
import { ListingPublishedEvent } from '../../domain/events/listing-published.event';

export const LISTINGS_EVENTS_PORT = Symbol('LISTINGS_EVENTS_PORT');

export interface ListingsEventsPort {
  listingCreated(event: ListingCreatedEvent): Promise<void>;
  listingPublished(event: ListingPublishedEvent): Promise<void>;
}
