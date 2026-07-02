import { Inject, Injectable } from '@nestjs/common';

import { EVENT_BUS_PORT, EventBusPort } from '../../../../shared/application/buses/event-bus.port';
import { ListingsEventsPort } from '../../application/ports/listings.events.port';
import { ListingCreatedEvent } from '../../domain/events/listing-created.event';
import { ListingPublishedEvent } from '../../domain/events/listing-published.event';

@Injectable()
export class ListingsEventPublisher implements ListingsEventsPort {
  constructor(
    @Inject(EVENT_BUS_PORT)
    private readonly eventBus: EventBusPort,
  ) {}

  async listingCreated(event: ListingCreatedEvent): Promise<void> {
    await this.eventBus.publish(event);
  }

  async listingPublished(event: ListingPublishedEvent): Promise<void> {
    await this.eventBus.publish(event);
  }
}
