/**
 * Who the seeker deals with when engaging the listing:
 * - direct_owner: direct deal with the property owner.
 * - owner_administrator: direct deal with an administrator acting on behalf of the owner.
 * - real_estate_agency: deal brokered by an agent / property manager / agency.
 * - developer: deal directly with the construction/development company.
 */
export const LISTING_DEAL_TYPES = [
  'direct_owner',
  'owner_administrator',
  'real_estate_agency',
  'developer',
] as const;

export type ListingDealType = (typeof LISTING_DEAL_TYPES)[number];
