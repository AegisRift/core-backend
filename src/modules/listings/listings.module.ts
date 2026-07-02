import { Module } from '@nestjs/common';

import { ListingsController } from './api/http/listings.controller';
import { CreateListingUseCase } from './application/commands/create-listing.use-case';
import { ListingsService } from './application/listings.service';
import { LISTINGS_EVENTS_PORT } from './application/ports/listings.events.port';
import { LISTINGS_REPOSITORY_PORT } from './application/ports/listings.repository.port';
import { ListingsEventPublisher } from './infrastructure/events/listings.event.publisher';
import { ListingsDrizzleRepository } from './infrastructure/persistence/listings.drizzle.repository';

@Module({
  controllers: [ListingsController],
  providers: [
    ListingsService,
    CreateListingUseCase,
    ListingsDrizzleRepository,
    ListingsEventPublisher,
    {
      provide: LISTINGS_REPOSITORY_PORT,
      useExisting: ListingsDrizzleRepository,
    },
    {
      provide: LISTINGS_EVENTS_PORT,
      useExisting: ListingsEventPublisher,
    },
  ],
})
export class ListingsModule {}
