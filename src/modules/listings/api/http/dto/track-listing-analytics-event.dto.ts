export class TrackListingAnalyticsEventDto {
  eventType!: 'view' | 'save' | 'lead' | 'visit_scheduled' | 'application' | 'chat_message';
  value?: number;
  actorUserId?: string;
  metadata?: Record<string, unknown>;
}
