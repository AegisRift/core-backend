import { DrizzleService } from '@infrastructure/database/drizzle/drizzle.service';
import {
  userBehaviorEvents,
  userBehaviorInsights,
} from '@infrastructure/database/drizzle/schema/analytics.schema';
import { Injectable } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';

export type UserBehaviorEventRow = typeof userBehaviorEvents.$inferSelect;
export type UserBehaviorInsightsRow = typeof userBehaviorInsights.$inferSelect;

export interface RecordBehaviorEventInput {
  userId: string;
  eventType: string;
  entityType: string;
  entityId?: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export interface UpsertInsightsInput {
  userId: string;
  preferredOperationType?: string;
  minPriceObserved?: number;
  maxPriceObserved?: number;
  avgPriceObserved?: number;
  topCountries: string[];
  topCities: string[];
  topAmenities: string[];
  searchCount: number;
  viewCount: number;
  saveCount: number;
  leadCount: number;
  engagement: Record<string, number>;
  features: Record<string, unknown>;
  lastActivityAt?: Date;
}

@Injectable()
export class BehaviorRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async recordEvent(input: RecordBehaviorEventInput): Promise<void> {
    await this.drizzle.db.insert(userBehaviorEvents).values({
      userId: input.userId,
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: input.payload,
      occurredAt: input.occurredAt,
    });
  }

  async getDistinctUserIds(): Promise<string[]> {
    const rows = await this.drizzle.db
      .selectDistinct({ userId: userBehaviorEvents.userId })
      .from(userBehaviorEvents);
    return rows.map((row) => row.userId);
  }

  async getRecentEventsByUser(userId: string, limit = 500): Promise<UserBehaviorEventRow[]> {
    return this.drizzle.db
      .select()
      .from(userBehaviorEvents)
      .where(eq(userBehaviorEvents.userId, userId))
      .orderBy(desc(userBehaviorEvents.occurredAt))
      .limit(limit);
  }

  async upsertInsights(input: UpsertInsightsInput): Promise<void> {
    const values = {
      userId: input.userId,
      preferredOperationType: input.preferredOperationType ?? null,
      minPriceObserved:
        input.minPriceObserved !== undefined ? String(input.minPriceObserved) : null,
      maxPriceObserved:
        input.maxPriceObserved !== undefined ? String(input.maxPriceObserved) : null,
      avgPriceObserved:
        input.avgPriceObserved !== undefined ? String(input.avgPriceObserved) : null,
      topCountries: input.topCountries,
      topCities: input.topCities,
      topAmenities: input.topAmenities,
      searchCount: input.searchCount,
      viewCount: input.viewCount,
      saveCount: input.saveCount,
      leadCount: input.leadCount,
      engagement: input.engagement,
      features: input.features,
      lastActivityAt: input.lastActivityAt ?? null,
      updatedAt: new Date(),
    };
    await this.drizzle.db
      .insert(userBehaviorInsights)
      .values(values)
      .onConflictDoUpdate({
        target: userBehaviorInsights.userId,
        set: { ...values, userId: sql`excluded.user_id` },
      });
  }

  async getInsights(userId: string): Promise<UserBehaviorInsightsRow | null> {
    const [row] = await this.drizzle.db
      .select()
      .from(userBehaviorInsights)
      .where(eq(userBehaviorInsights.userId, userId))
      .limit(1);
    return row ?? null;
  }
}
