import { Injectable } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';

import { DomainEvent } from '../../../shared/domain/events/domain-event';
import { DrizzleExecutor, DrizzleService } from '../../database/drizzle/drizzle.service';
import { outboxEvents } from '../../database/drizzle/schema/outbox.schema';

@Injectable()
export class OutboxRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  /**
   * Persists a domain event. Pass the transaction handle used for the domain
   * write so the event is stored atomically with the state change.
   */
  async add(event: DomainEvent, executor?: DrizzleExecutor): Promise<void> {
    const db = executor ?? this.drizzle.db;
    await db.insert(outboxEvents).values({
      eventType: event.eventType,
      eventVersion: event.eventVersion,
      aggregateId: event.aggregateId,
      payload: event.payload,
      correlationId: event.correlationId,
      causationId: event.causationId,
      occurredAt: new Date(event.occurredAt),
      isPublished: false,
    });
  }

  async getUnpublished(limit = 100) {
    return this.drizzle.db
      .select()
      .from(outboxEvents)
      .where(and(eq(outboxEvents.isPublished, false), isNull(outboxEvents.publishedAt)))
      .orderBy(asc(outboxEvents.occurredAt))
      .limit(limit);
  }

  async markAsPublished(id: string): Promise<void> {
    await this.drizzle.db
      .update(outboxEvents)
      .set({ isPublished: true, publishedAt: new Date() })
      .where(eq(outboxEvents.id, id));
  }
}
