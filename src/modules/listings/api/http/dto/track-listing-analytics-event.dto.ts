import { IsIn, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class TrackListingAnalyticsEventDto {
  @IsIn(['save', 'lead', 'visit_scheduled', 'application', 'chat_message'])
  eventType!: 'save' | 'lead' | 'visit_scheduled' | 'application' | 'chat_message';

  @IsOptional()
  @IsInt()
  @Min(1)
  value?: number;

  @IsOptional()
  @IsString()
  actorUserId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
