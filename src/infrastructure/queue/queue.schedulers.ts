import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Queue } from 'bullmq';

import { envConfig } from '../../config/env.config';

const OUTBOX_RELAY_EVERY_MS = 5_000;
const ANALYTICS_AGGREGATION_EVERY_MS = 60_000;

/**
 * Registers the repeatable jobs that drive the event pipeline:
 * - outbox-relay: drains outbox_events into the internal event bus.
 * - analytics: aggregates raw behavior events into per-user insights.
 */
@Injectable()
export class QueueSchedulers implements OnApplicationBootstrap {
  constructor(
    @InjectQueue('outbox-relay') private readonly outboxRelayQueue: Queue,
    @InjectQueue('analytics') private readonly analyticsQueue: Queue,
    @Inject(envConfig.KEY) private readonly env: ConfigType<typeof envConfig>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.env.nodeEnv === 'test') {
      return;
    }
    await this.outboxRelayQueue.add(
      'drain',
      {},
      {
        jobId: 'outbox-relay-drain',
        repeat: { every: OUTBOX_RELAY_EVERY_MS },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
    await this.analyticsQueue.add(
      'aggregate-user-insights',
      {},
      {
        jobId: 'analytics-aggregate-user-insights',
        repeat: { every: ANALYTICS_AGGREGATION_EVERY_MS },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }
}
