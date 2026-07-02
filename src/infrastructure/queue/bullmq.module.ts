import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AnalyticsWorker } from '../../jobs/workers/analytics.worker';
import { DocumentsWorker } from '../../jobs/workers/documents.worker';
import { NotificationsWorker } from '../../jobs/workers/notifications.worker';
import { SearchIndexWorker } from '../../jobs/workers/search-index.worker';
import { OutboxRelayWorker } from '../messaging/outbox/outbox.relay.worker';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'notifications' },
      { name: 'documents' },
      { name: 'search-index' },
      { name: 'analytics' },
      { name: 'outbox-relay' },
      { name: 'payments-webhooks' },
    ),
  ],
  providers: [
    NotificationsWorker,
    SearchIndexWorker,
    DocumentsWorker,
    AnalyticsWorker,
    OutboxRelayWorker,
  ],
  exports: [BullModule],
})
export class QueueModule {}
