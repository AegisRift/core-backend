import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';

import { EVENT_BUS_PORT, EventBusPort } from '../../../shared/application/buses/event-bus.port';
import { DomainEvent } from '../../../shared/domain/events/domain-event';

import { OutboxRepository } from './outbox.repository';

@Processor('outbox-relay')
export class OutboxRelayWorker extends WorkerHost {
  constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    private readonly outboxRepository: OutboxRepository,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    void job;
    const events = await this.outboxRepository.getUnpublished(100);
    for (const row of events) {
      const event: DomainEvent = {
        eventId: row.id,
        eventType: row.eventType,
        eventVersion: row.eventVersion,
        aggregateId: row.aggregateId,
        payload: (row.payload ?? {}) as Record<string, unknown>,
        occurredAt: row.occurredAt.toISOString(),
        correlationId: row.correlationId,
        causationId: row.causationId ?? undefined,
      };
      await this.eventBus.publish(event);
      await this.outboxRepository.markAsPublished(row.id);
    }
  }
}
