import { OutboxRepository } from '@infrastructure/messaging/outbox/outbox.repository';
import { Injectable } from '@nestjs/common';

import { EVENT_TOPICS } from '../../../events/contracts/integration-events/keuwo-events.examples';
import { buildDomainEvent } from '../../../shared/domain/events/build-domain-event';
import { SearchListingsQueryDto } from '../api/http/dto/search-listings.query.dto';
import { PaginationInput, SearchRepository } from '../infrastructure/persistence/search.repository';

@Injectable()
export class SearchService {
  constructor(
    private readonly searchRepository: SearchRepository,
    private readonly outbox: OutboxRepository,
  ) {}

  async searchListings(query: SearchListingsQueryDto) {
    const { userId, ...filters } = query;
    const result = await this.searchRepository.searchListings(filters);

    if (userId) {
      await this.searchRepository.recordSearchHistory({
        userId,
        queryText: filters.q,
        operationType: filters.operationType,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        country: filters.country,
        city: filters.city,
        distanceRangeKm: filters.radiusKm,
        userLat: filters.lat,
        userLng: filters.lng,
        bedrooms: filters.bedrooms,
      });
      await this.outbox.add(
        buildDomainEvent({
          eventType: EVENT_TOPICS.SEARCH_PERFORMED,
          aggregateId: userId,
          payload: {
            userId,
            queryText: filters.q,
            filters: {
              operationType: filters.operationType,
              dealType: filters.dealType,
              developerId: filters.developerId,
              furnished: filters.furnished,
              rentPeriod: filters.rentPeriod,
              minPrice: filters.minPrice,
              maxPrice: filters.maxPrice,
              bedrooms: filters.bedrooms,
              bathrooms: filters.bathrooms,
              minAreaM2: filters.minAreaM2,
              maxAreaM2: filters.maxAreaM2,
              country: filters.country,
              city: filters.city,
              amenities: filters.amenities,
              lat: filters.lat,
              lng: filters.lng,
              radiusKm: filters.radiusKm,
            },
            resultsCount: result.total,
          },
        }),
      );
    }

    return result;
  }

  getRecentSearchHistory(userId: string, pagination?: PaginationInput) {
    return this.searchRepository.getRecentSearchHistory(userId, pagination);
  }
}
