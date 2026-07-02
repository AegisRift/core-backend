import { Global, Module } from '@nestjs/common';

import { DualPublishAdapter } from './internal-event-bus/dual-publish.adapter';
import { InternalEventBusAdapter } from './internal-event-bus/internal-event-bus.adapter';
import { OutboxRepository } from './outbox/outbox.repository';

@Global()
@Module({
  providers: [
    InternalEventBusAdapter,
    DualPublishAdapter,
    InternalEventBusAdapter.provider,
    OutboxRepository,
  ],
  exports: [InternalEventBusAdapter.provider, OutboxRepository, DualPublishAdapter],
})
export class MessagingModule {}
