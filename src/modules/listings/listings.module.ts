import { Module } from '@nestjs/common';

import { ListingsController } from './api/http/listings.controller';
import { ListingsService } from './application/listings.service';
import { LISTINGS_REPOSITORY_PORT } from './application/ports/listings.repository.port';
import { ListingsDrizzleRepository } from './infrastructure/persistence/listings.drizzle.repository';

@Module({
  controllers: [ListingsController],
  providers: [
    ListingsService,
    ListingsDrizzleRepository,
    {
      provide: LISTINGS_REPOSITORY_PORT,
      useExisting: ListingsDrizzleRepository,
    },
  ],
  exports: [ListingsDrizzleRepository],
})
export class ListingsModule {}
