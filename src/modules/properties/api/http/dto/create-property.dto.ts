export class CreatePropertyDto {
  advertiserUserId!: string;
  developerName?: string;
  complexName?: string;
  operationType!: 'rent' | 'buy';
  rentPeriod?: 'short' | 'long' | 'indefinite';
  areaM2!: number;
  bedrooms!: number;
  bathrooms!: number;
  amenities!: string[];
  photos!: Array<{
    url: string;
    category: 'cover' | 'interior' | 'exterior' | 'amenity' | 'floorplan';
  }>;
  description!: string;
  cost!: number;
  requirements!: Array<'official_id' | 'proof_of_income' | 'credit_report' | 'down_payment_proof'>;
  availability?: 'unavailable' | 'available_soon' | 'available_on_date' | 'available';
  availableFromDate?: string;
  publishedAt?: string;
  nearbyPoints!: Array<{ name: string; distanceM: number; category: string }>;
  mapLocation!: { lat: number; lng: number; address?: string };
}
