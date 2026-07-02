import { Controller, Get, Param } from '@nestjs/common';

import { AnalyticsService } from '../../application/analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('users/:userId/insights')
  getUserInsights(@Param('userId') userId: string) {
    return this.analyticsService.getUserInsights(userId);
  }
}
