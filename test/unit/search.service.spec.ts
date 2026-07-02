import { SearchService } from '../../src/modules/search/application/search.service';
import { DomainEvent } from '../../src/shared/domain/events/domain-event';

describe('SearchService', () => {
  const buildService = () => {
    const searchRepository = {
      searchListings: jest.fn(async () => ({
        items: [],
        total: 5,
        page: 1,
        pageSize: 20,
      })),
      recordSearchHistory: jest.fn(async () => undefined),
      getRecentSearchHistory: jest.fn(async () => []),
    };
    const outbox = {
      add: jest.fn(async (event: DomainEvent) => {
        void event;
      }),
    };
    const service = new SearchService(searchRepository as never, outbox as never);
    return { service, searchRepository, outbox };
  };

  it('delegates filters to the repository', async () => {
    const { service, searchRepository } = buildService();
    await service.searchListings({
      q: 'depa centro',
      operationType: 'buy',
      minPrice: 100,
      maxPrice: 500,
      bedrooms: 2,
      city: 'Monterrey',
      sortBy: 'price_asc',
      page: 2,
      pageSize: 10,
    });
    expect(searchRepository.searchListings).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'depa centro',
        operationType: 'buy',
        minPrice: 100,
        maxPrice: 500,
        bedrooms: 2,
        city: 'Monterrey',
        sortBy: 'price_asc',
        page: 2,
        pageSize: 10,
      }),
    );
  });

  it('records history and emits a search_performed event when userId is present', async () => {
    const { service, searchRepository, outbox } = buildService();
    await service.searchListings({
      q: 'casa',
      operationType: 'rent',
      maxPrice: 20000,
      city: 'Monterrey',
      userId: 'user-1',
    });

    expect(searchRepository.recordSearchHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        queryText: 'casa',
        operationType: 'rent',
        maxPrice: 20000,
        city: 'Monterrey',
      }),
    );
    expect(outbox.add).toHaveBeenCalledTimes(1);
    const event = outbox.add.mock.calls[0][0] as DomainEvent<Record<string, unknown>>;
    expect(event.eventType).toBe('search.search_performed.v1');
    expect(event.aggregateId).toBe('user-1');
    expect(event.payload).toMatchObject({
      userId: 'user-1',
      queryText: 'casa',
      resultsCount: 5,
    });
  });

  it('does not record history nor emit events for anonymous searches', async () => {
    const { service, searchRepository, outbox } = buildService();
    await service.searchListings({ q: 'casa' });
    expect(searchRepository.recordSearchHistory).not.toHaveBeenCalled();
    expect(outbox.add).not.toHaveBeenCalled();
  });
});
