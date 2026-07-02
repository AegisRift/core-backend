export class CreateListingDto {
  propertyId!: string;
  title!: string;
  summary?: string;
  price!: number;
  publishedAt?: string;
  metadata?: Record<string, unknown>;
}
