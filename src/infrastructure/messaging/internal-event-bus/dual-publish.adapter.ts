import { Injectable } from '@nestjs/common';

import { DomainEvent } from '../../../shared/domain/events/domain-event';

import { InternalEventBusAdapter } from './internal-event-bus.adapter';

@Injectable()
export class DualPublishAdapter {
  constructor(private readonly internalBus: InternalEventBusAdapter) {}

  async publish(event: DomainEvent, kafkaEnabled: boolean): Promise<void> {
    await this.internalBus.publish(event);
    if (kafkaEnabled) {
      // Placeholder for future Kafka publisher implementation.
      void event;
    }
  }
}
