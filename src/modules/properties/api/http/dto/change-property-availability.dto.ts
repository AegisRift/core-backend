export class ChangePropertyAvailabilityDto {
  toStatus!: 'unavailable' | 'available_soon' | 'available_on_date' | 'available';
  reason!: string;
  changedByUserId?: string;
  availableFromDate?: string;
}
