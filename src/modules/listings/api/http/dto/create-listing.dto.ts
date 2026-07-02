import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import { LISTING_DEAL_TYPES, ListingDealType } from '../../../domain/listing.constants';

export class CreateListingDto {
  @IsUUID()
  propertyId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  /** direct_owner | owner_administrator | real_estate_agency | developer */
  @IsIn(LISTING_DEAL_TYPES)
  dealType!: ListingDealType;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
