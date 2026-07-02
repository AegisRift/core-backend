export interface BehaviorEventInput {
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export interface ComputedInsights {
  preferredOperationType?: string;
  minPriceObserved?: number;
  maxPriceObserved?: number;
  avgPriceObserved?: number;
  topCountries: string[];
  topCities: string[];
  topAmenities: string[];
  searchCount: number;
  viewCount: number;
  saveCount: number;
  leadCount: number;
  engagement: Record<string, number>;
  features: Record<string, unknown>;
  lastActivityAt?: Date;
}

function topEntries(counter: Map<string, number>, limit: number): string[] {
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

function increment(counter: Map<string, number>, key: unknown, by = 1): void {
  if (typeof key !== 'string' || key.length === 0) {
    return;
  }
  counter.set(key.toLowerCase(), (counter.get(key.toLowerCase()) ?? 0) + by);
}

/**
 * Pure aggregation of raw behavior events into the per-user feature set that
 * the recommendations/feed service consumes.
 */
export function computeUserInsights(events: BehaviorEventInput[]): ComputedInsights | null {
  if (events.length === 0) {
    return null;
  }

  const operationCounter = new Map<string, number>();
  const countryCounter = new Map<string, number>();
  const cityCounter = new Map<string, number>();
  const amenityCounter = new Map<string, number>();
  const bedroomsCounter = new Map<string, number>();
  const engagement: Record<string, number> = {};
  const priceSignals: number[] = [];

  let searchCount = 0;
  let lastActivityAt: Date | undefined;

  for (const event of events) {
    if (!lastActivityAt || event.occurredAt > lastActivityAt) {
      lastActivityAt = event.occurredAt;
    }

    if (event.eventType === 'search_performed') {
      searchCount += 1;
      engagement.search = (engagement.search ?? 0) + 1;
      const filters = (event.payload.filters ?? {}) as Record<string, unknown>;
      increment(operationCounter, filters.operationType);
      increment(countryCounter, filters.country);
      increment(cityCounter, filters.city);
      if (typeof filters.bedrooms === 'number') {
        increment(bedroomsCounter, String(filters.bedrooms));
      }
      if (Array.isArray(filters.amenities)) {
        for (const amenity of filters.amenities) {
          increment(amenityCounter, amenity);
        }
      }
      if (typeof filters.minPrice === 'number') priceSignals.push(filters.minPrice);
      if (typeof filters.maxPrice === 'number') priceSignals.push(filters.maxPrice);
      continue;
    }

    if (event.eventType === 'listing_interaction') {
      const interactionType =
        typeof event.payload.interactionType === 'string' ? event.payload.interactionType : 'view';
      engagement[interactionType] = (engagement[interactionType] ?? 0) + 1;
      const context = (event.payload.context ?? {}) as Record<string, unknown>;
      // Explicit interactions weigh more than passive views.
      const weight = interactionType === 'view' ? 1 : 2;
      increment(operationCounter, context.operationType, weight);
      increment(countryCounter, context.country, weight);
      increment(cityCounter, context.city, weight);
      if (typeof context.bedrooms === 'number') {
        increment(bedroomsCounter, String(context.bedrooms), weight);
      }
      if (Array.isArray(context.amenities)) {
        for (const amenity of context.amenities) {
          increment(amenityCounter, amenity, weight);
        }
      }
      if (typeof context.price === 'number') priceSignals.push(context.price);
      continue;
    }

    if (event.eventType === 'property_visit') {
      engagement.property_visit = (engagement.property_visit ?? 0) + 1;
      increment(operationCounter, event.payload.operationType, 3);
      increment(countryCounter, event.payload.country, 3);
      increment(cityCounter, event.payload.city, 3);
      if (typeof event.payload.cost === 'number') priceSignals.push(event.payload.cost);
    }
  }

  const [preferredOperationType] = topEntries(operationCounter, 1);
  const [preferredBedrooms] = topEntries(bedroomsCounter, 1);
  const minPriceObserved = priceSignals.length > 0 ? Math.min(...priceSignals) : undefined;
  const maxPriceObserved = priceSignals.length > 0 ? Math.max(...priceSignals) : undefined;
  const avgPriceObserved =
    priceSignals.length > 0
      ? Number((priceSignals.reduce((acc, val) => acc + val, 0) / priceSignals.length).toFixed(2))
      : undefined;

  return {
    preferredOperationType,
    minPriceObserved,
    maxPriceObserved,
    avgPriceObserved,
    topCountries: topEntries(countryCounter, 5),
    topCities: topEntries(cityCounter, 5),
    topAmenities: topEntries(amenityCounter, 10),
    searchCount,
    viewCount: engagement.view ?? 0,
    saveCount: engagement.save ?? 0,
    leadCount: engagement.lead ?? 0,
    engagement,
    features: {
      preferredBedrooms: preferredBedrooms !== undefined ? Number(preferredBedrooms) : undefined,
      priceSignalsCount: priceSignals.length,
      eventsAnalyzed: events.length,
    },
    lastActivityAt,
  };
}
