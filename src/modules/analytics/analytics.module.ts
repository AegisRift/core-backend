import { Module } from '@nestjs/common';

import { AnalyticsController } from './api/http/analytics.controller';
import { AnalyticsService } from './application/analytics.service';
import { BehaviorEventsConsumer } from './application/behavior-events.consumer';
import { BehaviorRepository } from './infrastructure/persistence/behavior.repository';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, BehaviorEventsConsumer, BehaviorRepository],
  exports: [AnalyticsService, BehaviorRepository],
})
export class AnalyticsModule {}
