/**
 * Canonical amenity catalog. Amenities are stored as an array of these enum
 * values so they can be tracked in behavioral insights and filtered in search
 * without free-text noise.
 */
export const PROPERTY_AMENITIES = [
  'pool',
  'gym',
  'parking',
  'garden',
  'terrace',
  'balcony',
  'roof_garden',
  'elevator',
  'security_24h',
  'gated_community',
  'coworking',
  'pet_friendly',
  'laundry_room',
  'playground',
  'bbq_area',
  'storage_unit',
  'air_conditioning',
  'heating',
  'solar_panels',
  'ev_charger',
  'cinema_room',
  'business_center',
  'spa',
  'jacuzzi',
  'tennis_court',
  'basketball_court',
  'concierge',
  'smart_home',
  'ocean_view',
] as const;

export type PropertyAmenity = (typeof PROPERTY_AMENITIES)[number];

export const PROPERTY_AVAILABILITIES = [
  'unavailable',
  'available_soon',
  'available_on_date',
  'available',
] as const;

export type PropertyAvailability = (typeof PROPERTY_AVAILABILITIES)[number];
