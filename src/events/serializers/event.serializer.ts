import { DomainEvent } from '../../shared/domain/events/domain-event';

export class EventSerializer {
  static serialize(event: DomainEvent): string {
    return JSON.stringify(event);
  }
}
