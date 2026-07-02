import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EVENT_TOPICS } from '../../../events/contracts/integration-events/keuwo-events.examples';
import { DomainEvent } from '../../../shared/domain/events/domain-event';
import { BehaviorRepository } from '../infrastructure/persistence/behavior.repository';

/**
 * Subscribes to behavioral domain events published on the internal event bus
 * (drained from the outbox) and persists them as raw user behavior events.
 */
@Injectable()
export class BehaviorEventsConsumer {
  private readonly logger = new Logger(BehaviorEventsConsumer.name);

  constructor(private readonly behaviorRepository: BehaviorRepository) {}

  @OnEvent(EVENT_TOPICS.SEARCH_PERFORMED)
  async onSearchPerformed(event: DomainEvent<Record<string, unknown>>): Promise<void> {
    const userId = typeof event.payload.userId === 'string' ? event.payload.userId : undefined;
    if (!userId) {
      return;
    }
    await this.record({
      userId,
      eventType: 'search_performed',
      entityType: 'search',
      entityId: undefined,
      payload: event.payload,
      occurredAt: new Date(event.occurredAt),
    });
  }

  @OnEvent(EVENT_TOPICS.LISTING_INTERACTION)
  async onListingInteraction(event: DomainEvent<Record<string, unknown>>): Promise<void> {
    const userId =
      typeof event.payload.actorUserId === 'string' ? event.payload.actorUserId : undefined;
    if (!userId) {
      return;
    }
    await this.record({
      userId,
      eventType: 'listing_interaction',
      entityType: 'listing',
      entityId: typeof event.payload.listingId === 'string' ? event.payload.listingId : undefined,
      payload: event.payload,
      occurredAt: new Date(event.occurredAt),
    });
  }

  @OnEvent(EVENT_TOPICS.PROPERTY_VISIT_REGISTERED)
  async onPropertyVisitRegistered(event: DomainEvent<Record<string, unknown>>): Promise<void> {
    const userId = typeof event.payload.userId === 'string' ? event.payload.userId : undefined;
    if (!userId) {
      return;
    }
    await this.record({
      userId,
      eventType: 'property_visit',
      entityType: 'property',
      entityId: typeof event.payload.propertyId === 'string' ? event.payload.propertyId : undefined,
      payload: event.payload,
      occurredAt: new Date(event.occurredAt),
    });
  }

  private async record(input: {
    userId: string;
    eventType: string;
    entityType: string;
    entityId?: string;
    payload: Record<string, unknown>;
    occurredAt: Date;
  }): Promise<void> {
    try {
      await this.behaviorRepository.recordEvent(input);
    } catch (error) {
      // Behavioral capture must never break event relaying.
      this.logger.error(
        `Failed to record behavior event ${input.eventType} for user ${input.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
