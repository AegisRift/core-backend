import { IsIn } from 'class-validator';

export class ChangeListingStatusDto {
  @IsIn(['published', 'paused', 'closed'])
  status!: 'published' | 'paused' | 'closed';
}
