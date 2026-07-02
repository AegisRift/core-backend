import { BehaviorEventsConsumer } from '../../src/modules/analytics/application/behavior-events.consumer';
import { computeUserInsights } from '../../src/modules/analytics/application/insights.aggregator';
import { DomainEvent } from '../../src/shared/domain/events/domain-event';

const baseEvent = (
  eventType: string,
  payload: Record<string, unknown>,
): DomainEvent<Record<string, unknown>> => ({
  eventId: 'event-1',
  eventType,
  eventVersion: 1,
  aggregateId: 'aggregate-1',
  occurredAt: new Date('2026-07-01T12:00:00Z').toISOString(),
  correlationId: 'corr-1',
  payload,
});

describe('BehaviorEventsConsumer', () => {
  const buildConsumer = () => {
    const behaviorRepository = {
      recordEvent: jest.fn(async () => undefined),
    };
    const consumer = new BehaviorEventsConsumer(behaviorRepository as never);
    return { consumer, behaviorRepository };
  };

  it('persists search_performed events with the user id', async () => {
    const { consumer, behaviorRepository } = buildConsumer();
    await consumer.onSearchPerformed(
      baseEvent('search.search_performed.v1', {
        userId: 'user-1',
        queryText: 'depa',
        filters: { operationType: 'buy' },
        resultsCount: 3,
      }),
    );
    expect(behaviorRepository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        eventType: 'search_performed',
        entityType: 'search',
      }),
    );
  });

  it('persists listing interactions keyed by actorUserId', async () => {
    const { consumer, behaviorRepository } = buildConsumer();
    await consumer.onListingInteraction(
      baseEvent('listings.listing_interaction.v1', {
        listingId: 'listing-1',
        propertyId: 'property-1',
        interactionType: 'save',
        actorUserId: 'user-2',
        context: { operationType: 'rent', price: 12000 },
      }),
    );
    expect(behaviorRepository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-2',
        eventType: 'listing_interaction',
        entityType: 'listing',
        entityId: 'listing-1',
      }),
    );
  });

  it('ignores events without a user id', async () => {
    const { consumer, behaviorRepository } = buildConsumer();
    await consumer.onSearchPerformed(
      baseEvent('search.search_performed.v1', { filters: {}, resultsCount: 0 }),
    );
    await consumer.onListingInteraction(
      baseEvent('listings.listing_interaction.v1', {
        listingId: 'listing-1',
        interactionType: 'view',
      }),
    );
    expect(behaviorRepository.recordEvent).not.toHaveBeenCalled();
  });

  it('never throws when persistence fails', async () => {
    const behaviorRepository = {
      recordEvent: jest.fn(async () => {
        throw new Error('db down');
      }),
    };
    const consumer = new BehaviorEventsConsumer(behaviorRepository as never);
    await expect(
      consumer.onSearchPerformed(
        baseEvent('search.search_performed.v1', {
          userId: 'user-1',
          filters: {},
          resultsCount: 0,
        }),
      ),
    ).resolves.toBeUndefined();
  });
});

describe('computeUserInsights', () => {
  it('returns null when there are no events', () => {
    expect(computeUserInsights([])).toBeNull();
  });

  it('aggregates searches, interactions and visits into user features', () => {
    const insights = computeUserInsights([
      {
        eventType: 'search_performed',
        occurredAt: new Date('2026-07-01T10:00:00Z'),
        payload: {
          filters: {
            operationType: 'buy',
            country: 'MX',
            city: 'Monterrey',
            minPrice: 1000000,
            maxPrice: 5000000,
            bedrooms: 3,
            amenities: ['pool'],
          },
        },
      },
      {
        eventType: 'listing_interaction',
        occurredAt: new Date('2026-07-01T11:00:00Z'),
        payload: {
          interactionType: 'view',
          context: {
            operationType: 'buy',
            price: 3500000,
            country: 'MX',
            city: 'Monterrey',
            bedrooms: 3,
            amenities: ['pool', 'gym'],
          },
        },
      },
      {
        eventType: 'listing_interaction',
        occurredAt: new Date('2026-07-01T11:30:00Z'),
        payload: {
          interactionType: 'save',
          context: {
            operationType: 'buy',
            price: 3500000,
            country: 'MX',
            city: 'Monterrey',
          },
        },
      },
      {
        eventType: 'property_visit',
        occurredAt: new Date('2026-07-01T12:00:00Z'),
        payload: {
          operationType: 'buy',
          cost: 3500000,
          country: 'MX',
          city: 'Monterrey',
        },
      },
    ]);

    expect(insights).not.toBeNull();
    expect(insights?.preferredOperationType).toBe('buy');
    expect(insights?.topCountries).toEqual(['mx']);
    expect(insights?.topCities).toEqual(['monterrey']);
    expect(insights?.topAmenities[0]).toBe('pool');
    expect(insights?.searchCount).toBe(1);
    expect(insights?.viewCount).toBe(1);
    expect(insights?.saveCount).toBe(1);
    expect(insights?.minPriceObserved).toBe(1000000);
    expect(insights?.maxPriceObserved).toBe(5000000);
    expect(insights?.engagement).toMatchObject({
      search: 1,
      view: 1,
      save: 1,
      property_visit: 1,
    });
    expect(insights?.lastActivityAt?.toISOString()).toBe('2026-07-01T12:00:00.000Z');
    expect(insights?.features).toMatchObject({ preferredBedrooms: 3 });
  });
});
