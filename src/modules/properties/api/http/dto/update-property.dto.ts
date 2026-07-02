import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDivisibleBy,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import { PROPERTY_AMENITIES, PropertyAmenity } from '../../../domain/property.constants';

import { MapLocationDto, NearbyPointDto, PropertyPhotoDto } from './create-property.dto';

export class UpdatePropertyDto {
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

  @IsOptional()
  @IsIn(['short', 'long', 'indefinite'])
  rentPeriod?: 'short' | 'long' | 'indefinite';

  @IsOptional()
  @IsNumber()
  @Min(0)
  areaM2?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number;

  /** Supports half baths, e.g. 2.5. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @IsDivisibleBy(0.5)
  bathrooms?: number;

  /** Whether the property is furnished. */
  @IsOptional()
  @IsBoolean()
  furnished?: boolean;

  @IsOptional()
  @IsArray()
  @IsIn(PROPERTY_AMENITIES, { each: true })
  amenities?: PropertyAmenity[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyPhotoDto)
  photos?: PropertyPhotoDto[];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsArray()
  @IsIn(['official_id', 'proof_of_income', 'credit_report', 'down_payment_proof'], { each: true })
  requirements?: Array<'official_id' | 'proof_of_income' | 'credit_report' | 'down_payment_proof'>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NearbyPointDto)
  nearbyPoints?: NearbyPointDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => MapLocationDto)
  mapLocation?: MapLocationDto;
}
