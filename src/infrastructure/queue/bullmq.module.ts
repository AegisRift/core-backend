import { AnalyticsModule } from '@modules/analytics/analytics.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AnalyticsWorker } from '../../jobs/workers/analytics.worker';
import { DocumentsWorker } from '../../jobs/workers/documents.worker';
import { SearchIndexWorker } from '../../jobs/workers/search-index.worker';
import { OutboxRelayWorker } from '../messaging/outbox/outbox.relay.worker';

import { QueueSchedulers } from './queue.schedulers';

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
    AnalyticsModule,
  ],
  providers: [
    SearchIndexWorker,
    DocumentsWorker,
    AnalyticsWorker,
    OutboxRelayWorker,
    QueueSchedulers,
  ],
  exports: [BullModule],
})
export class QueueModule {}
