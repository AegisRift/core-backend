import { AnalyticsService } from '@modules/analytics/application/analytics.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

/**
 * Repeatable job that materializes user_behavior_insights from the raw
 * user_behavior_events captured by the behavior events consumer.
 */
@Processor('analytics')
export class AnalyticsWorker extends WorkerHost {
  private readonly logger = new Logger(AnalyticsWorker.name);

  constructor(private readonly analyticsService: AnalyticsService) {
    super();
  }

  async process(job: Job<Record<string, unknown>>): Promise<void> {
    void job;
    const { usersProcessed } = await this.analyticsService.aggregateAllUsers();
    if (usersProcessed > 0) {
      this.logger.log(`Aggregated behavior insights for ${usersProcessed} user(s)`);
    }
  }
}
