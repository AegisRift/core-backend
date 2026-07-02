import { DomainEvent } from '../../../../shared/domain/events/domain-event';

export interface ListingCreatedPayload {
  listingId: string;
  propertyId: string;
  title: string;
  price: number;
}

export type ListingCreatedEvent = DomainEvent<ListingCreatedPayload>;
