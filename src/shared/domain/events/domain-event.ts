export interface DomainEvent<TPayload = unknown> {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  aggregateId: string;
  correlationId: string;
  causationId?: string;
  payload: TPayload;
  metadata?: Record<string, unknown>;
}
