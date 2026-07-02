import { Injectable, NotFoundException } from '@nestjs/common';

import { BehaviorRepository } from '../infrastructure/persistence/behavior.repository';

import { computeUserInsights } from './insights.aggregator';

@Injectable()
export class AnalyticsService {
  constructor(private readonly behaviorRepository: BehaviorRepository) {}

  /**
   * Returns the materialized insights for a user; falls back to an on-demand
   * aggregation when the worker has not materialized them yet.
   */
  async getUserInsights(userId: string) {
    const materialized = await this.behaviorRepository.getInsights(userId);
    if (materialized) {
      return { ...materialized, materialized: true };
    }

    const events = await this.behaviorRepository.getRecentEventsByUser(userId);
    const computed = computeUserInsights(
      events.map((event) => ({
        eventType: event.eventType,
        payload: event.payload as Record<string, unknown>,
        occurredAt: event.occurredAt,
      })),
    );
    if (!computed) {
      throw new NotFoundException('No behavioral data for this user');
    }
    return { userId, ...computed, materialized: false };
  }

  /**
   * Re-aggregates insights for every user with recorded behavior events.
   * Invoked by the analytics repeatable job.
   */
  async aggregateAllUsers(): Promise<{ usersProcessed: number }> {
    const userIds = await this.behaviorRepository.getDistinctUserIds();
    for (const userId of userIds) {
      const events = await this.behaviorRepository.getRecentEventsByUser(userId);
      const computed = computeUserInsights(
        events.map((event) => ({
          eventType: event.eventType,
          payload: event.payload as Record<string, unknown>,
          occurredAt: event.occurredAt,
        })),
      );
      if (!computed) {
        continue;
      }
      await this.behaviorRepository.upsertInsights({ userId, ...computed });
    }
    return { usersProcessed: userIds.length };
  }
}
