import { randomUUID } from 'node:crypto';

import { CorrelationContext } from '../../utils/correlation-context';

import { DomainEvent } from './domain-event';

export function buildDomainEvent<TPayload>(input: {
  eventType: string;
  aggregateId: string;
  payload: TPayload;
  eventVersion?: number;
  causationId?: string;
}): DomainEvent<TPayload> {
  return {
    eventId: randomUUID(),
    eventType: input.eventType,
    eventVersion: input.eventVersion ?? 1,
    aggregateId: input.aggregateId,
    payload: input.payload,
    occurredAt: new Date().toISOString(),
    correlationId: CorrelationContext.getCorrelationId() ?? randomUUID(),
    causationId: input.causationId,
  };
}
