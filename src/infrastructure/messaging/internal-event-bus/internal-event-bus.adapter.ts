import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { EventBusPort, EVENT_BUS_PORT } from '../../../shared/application/buses/event-bus.port';
import { DomainEvent } from '../../../shared/domain/events/domain-event';

@Injectable()
export class InternalEventBusAdapter implements EventBusPort {
  static readonly provider = {
    provide: EVENT_BUS_PORT,
    useExisting: InternalEventBusAdapter,
  };

  constructor(private readonly emitter: EventEmitter2) {}

  async publish(event: DomainEvent): Promise<void> {
    this.emitter.emit(event.eventType, event);
  }
}
