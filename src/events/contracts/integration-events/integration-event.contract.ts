export interface IntegrationEvent<TPayload = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  aggregateId: string;
  correlationId: string;
  causationId?: string;
  actor?: string;
  payload: TPayload;
  metadata?: Record<string, unknown>;
}
