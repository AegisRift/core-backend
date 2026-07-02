import { IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class ChangePropertyAvailabilityDto {
  @IsIn(['unavailable', 'available_soon', 'available_on_date', 'available'])
  toStatus!: 'unavailable' | 'available_soon' | 'available_on_date' | 'available';

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsString()
  changedByUserId?: string;

  /** Required when toStatus is 'available_on_date'. */
  @ValidateIf(
    (dto: ChangePropertyAvailabilityDto) =>
      dto.toStatus === 'available_on_date' || dto.availableFromDate !== undefined,
  )
  @IsISO8601()
  availableFromDate?: string;
}
