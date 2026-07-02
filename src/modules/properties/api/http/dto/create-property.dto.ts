import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDivisibleBy,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { PROPERTY_AMENITIES, PropertyAmenity } from '../../../domain/property.constants';

export class PropertyPhotoDto {
  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsIn(['cover', 'interior', 'exterior', 'amenity', 'floorplan'])
  category!: 'cover' | 'interior' | 'exterior' | 'amenity' | 'floorplan';
}

export class NearbyPointDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(0)
  distanceM!: number;

  @IsString()
  @IsNotEmpty()
  category!: string;
}

export class MapLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  @IsNotEmpty()
  country!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;
}

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  advertiserUserId!: string;

  @IsOptional()
  @IsString()
  developerName?: string;

  /** Id of the developer/construction company this property belongs to. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  developerId?: string;

  @IsOptional()
  @IsString()
  complexName?: string;

  @IsIn(['rent', 'buy'])
  operationType!: 'rent' | 'buy';

  @IsOptional()
  @IsIn(['short', 'long', 'indefinite'])
  rentPeriod?: 'short' | 'long' | 'indefinite';

  @IsNumber()
  @Min(0)
  areaM2!: number;

  @IsInt()
  @Min(0)
  bedrooms!: number;

  /** Supports half baths, e.g. 2.5. */
  @IsNumber()
  @Min(0)
  @IsDivisibleBy(0.5)
  bathrooms!: number;

  /** Whether the property is furnished. */
  @IsBoolean()
  furnished!: boolean;

  @IsArray()
  @IsIn(PROPERTY_AMENITIES, { each: true })
  amenities!: PropertyAmenity[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyPhotoDto)
  photos!: PropertyPhotoDto[];

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  @Min(0)
  cost!: number;

  @IsArray()
  @IsIn(['official_id', 'proof_of_income', 'credit_report', 'down_payment_proof'], { each: true })
  requirements!: Array<'official_id' | 'proof_of_income' | 'credit_report' | 'down_payment_proof'>;

  @IsOptional()
  @IsIn(['unavailable', 'available_soon', 'available_on_date', 'available'])
  availability?: 'unavailable' | 'available_soon' | 'available_on_date' | 'available';

  /** Required when availability is 'available_on_date'. */
  @ValidateIf(
    (dto: CreatePropertyDto) =>
      dto.availability === 'available_on_date' || dto.availableFromDate !== undefined,
  )
  @IsISO8601()
  availableFromDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NearbyPointDto)
  nearbyPoints!: NearbyPointDto[];

  @ValidateNested()
  @Type(() => MapLocationDto)
  mapLocation!: MapLocationDto;
}
