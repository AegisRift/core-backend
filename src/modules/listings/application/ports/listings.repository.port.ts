import type { ListingsDrizzleRepository } from '../../infrastructure/persistence/listings.drizzle.repository';

export const LISTINGS_REPOSITORY_PORT = Symbol('LISTINGS_REPOSITORY_PORT');

/**
 * Contract the application layer depends on. Derived from the Drizzle
 * implementation so it always covers the real persistence surface.
 */
export type ListingsRepositoryPort = Pick<
  ListingsDrizzleRepository,
  | 'create'
  | 'findAllAvailable'
  | 'findById'
  | 'findPropertyById'
  | 'findByIdWithProperty'
  | 'findByIdAvailable'
  | 'update'
  | 'remove'
  | 'publish'
  | 'changeStatus'
  | 'trackAnalyticsEvent'
  | 'trackListingView'
  | 'getAnalytics'
>;
