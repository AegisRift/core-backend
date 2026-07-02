import { LISTING_DEAL_TYPES, ListingDealType } from '@modules/listings/domain/listing.constants';
import { PROPERTY_AMENITIES, PropertyAmenity } from '@modules/properties/domain/property.constants';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDivisibleBy,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SearchListingsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['rent', 'buy'])
  operationType?: 'rent' | 'buy';

  /** direct_owner | owner_administrator | real_estate_agency | developer */
  @IsOptional()
  @IsIn(LISTING_DEAL_TYPES)
  dealType?: ListingDealType;

  /** Id of the developer/construction company. */
  @IsOptional()
  @IsString()
  developerId?: string;

  @IsOptional()
  @IsIn(['short', 'long', 'indefinite'])
  rentPeriod?: 'short' | 'long' | 'indefinite';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bedrooms?: number;

  /** Supports half baths, e.g. 2.5. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsDivisibleBy(0.5)
  bathrooms?: number;

  /** Only furnished (true) or only unfurnished (false) properties. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' || value === true
      ? true
      : value === 'false' || value === false
        ? false
        : value,
  )
  @IsBoolean()
  furnished?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAreaM2?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxAreaM2?: number;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value
      : String(value)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
  )
  @IsArray()
  @IsIn(PROPERTY_AMENITIES, { each: true })
  amenities?: PropertyAmenity[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  radiusKm?: number;

  @IsOptional()
  @IsIn(['relevance', 'newest', 'price_asc', 'price_desc'])
  sortBy?: 'relevance' | 'newest' | 'price_asc' | 'price_desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  userId?: string;
}
