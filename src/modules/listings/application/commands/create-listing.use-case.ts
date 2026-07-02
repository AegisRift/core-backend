import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import { OutboxRepository } from '../../../../infrastructure/messaging/outbox/outbox.repository';
import { CorrelationContext } from '../../../../shared/utils/correlation-context';
import { ListingEntity } from '../../domain/entities/listing.entity';
import {
  LISTINGS_REPOSITORY_PORT,
  ListingsRepositoryPort,
} from '../ports/listings.repository.port';

interface CreateListingCommand {
  propertyId: string;
  title: string;
  price: number;
}

@Injectable()
export class CreateListingUseCase {
  constructor(
    @Inject(LISTINGS_REPOSITORY_PORT)
    private readonly repository: ListingsRepositoryPort,
    private readonly outbox: OutboxRepository,
  ) {}

  async execute(command: CreateListingCommand): Promise<{ listingId: string }> {
    const listingId = randomUUID();
    const listing = new ListingEntity(listingId, command.propertyId, command.title, command.price);
    await this.repository.save(listing);

    await this.outbox.add({
      eventId: randomUUID(),
      eventType: 'listings.listing_created.v1',
      eventVersion: 1,
      aggregateId: listingId,
      occurredAt: new Date().toISOString(),
      correlationId: CorrelationContext.getCorrelationId() ?? randomUUID(),
      payload: {
        listingId,
        propertyId: command.propertyId,
        title: command.title,
        price: command.price,
      },
    });
    return { listingId };
  }
}
