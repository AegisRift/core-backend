import { DrizzleService } from '@infrastructure/database/drizzle/drizzle.service';
import {
  listingAnalyticsEvents,
  listings,
  properties,
} from '@infrastructure/database/drizzle/schema/real-estate.schema';
import { OutboxRepository } from '@infrastructure/messaging/outbox/outbox.repository';
import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';

import { DomainEvent } from '../../../../shared/domain/events/domain-event';
import { ListingDealType } from '../../domain/listing.constants';

export type ListingRow = typeof listings.$inferSelect;
export type PropertyRow = typeof properties.$inferSelect;

export interface CreateListingInput {
  propertyId: string;
  title: string;
  summary?: string;
  dealType: ListingDealType;
  price: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateListingInput {
  title?: string;
  summary?: string;
  dealType?: ListingDealType;
  price?: number;
  metadata?: Record<string, unknown>;
}

export type ListingInteractionType =
  'view' | 'save' | 'lead' | 'visit_scheduled' | 'application' | 'chat_message';

type EventsFactory = (row: ListingRow) => DomainEvent[];

@Injectable()
export class ListingsDrizzleRepository {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly outbox: OutboxRepository,
  ) {}

  async create(input: CreateListingInput, eventsFactory?: EventsFactory): Promise<ListingRow> {
    return this.drizzle.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(listings)
        .values({
          propertyId: input.propertyId,
          title: input.title,
          summary: input.summary,
          dealType: input.dealType,
          price: String(input.price),
          status: 'draft',
          publishedAt: null,
          metadata: input.metadata ?? {},
        })
        .returning();
      for (const event of eventsFactory?.(created) ?? []) {
        await this.outbox.add(event, tx);
      }
      return created;
    });
  }

  async findAllAvailable() {
    return this.drizzle.db
      .select({
        listing: listings,
        property: properties,
      })
      .from(listings)
      .innerJoin(properties, eq(properties.id, listings.propertyId))
      .where(
        and(
          eq(listings.status, 'published'),
          eq(properties.status, 'published'),
          ne(properties.availability, 'unavailable'),
        ),
      )
      .orderBy(desc(listings.createdAt));
  }

  async findById(listingId: string): Promise<ListingRow | undefined> {
    const [listing] = await this.drizzle.db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    return listing;
  }

  async findPropertyById(propertyId: string): Promise<PropertyRow | null> {
    const [row] = await this.drizzle.db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);
    return row ?? null;
  }

  async findByIdWithProperty(listingId: string) {
    const [row] = await this.drizzle.db
      .select({
        listing: listings,
        property: properties,
      })
      .from(listings)
      .innerJoin(properties, eq(properties.id, listings.propertyId))
      .where(eq(listings.id, listingId))
      .limit(1);
    return row ?? null;
  }

  async findByIdAvailable(listingId: string) {
    const row = await this.findByIdWithProperty(listingId);
    if (
      !row ||
      row.listing.status !== 'published' ||
      row.property.status !== 'published' ||
      row.property.availability === 'unavailable'
    ) {
      return null;
    }
    return row;
  }

  async update(listingId: string, input: UpdateListingInput) {
    const [updated] = await this.drizzle.db
      .update(listings)
      .set({
        title: input.title,
        summary: input.summary,
        dealType: input.dealType,
        price: input.price !== undefined ? String(input.price) : undefined,
        metadata: input.metadata,
        updatedAt: new Date(),
      })
      .where(eq(listings.id, listingId))
      .returning();
    return updated;
  }

  async remove(listingId: string): Promise<void> {
    await this.drizzle.db.delete(listings).where(eq(listings.id, listingId));
  }

  async publish(listingId: string, eventsFactory?: EventsFactory) {
    return this.drizzle.db.transaction(async (tx) => {
      const [published] = await tx
        .update(listings)
        .set({
          status: 'published',
          publishedAt: new Date(),
          deactivatedAt: null,
          updatedAt: new Date(),
        })
        .where(and(eq(listings.id, listingId), inArray(listings.status, ['draft', 'paused'])))
        .returning();
      if (!published) {
        return null;
      }
      for (const event of eventsFactory?.(published) ?? []) {
        await this.outbox.add(event, tx);
      }
      return published;
    });
  }

  async changeStatus(
    listingId: string,
    status: 'published' | 'paused' | 'closed',
    eventsFactory?: EventsFactory,
  ) {
    return this.drizzle.db.transaction(async (tx) => {
      const [changed] = await tx
        .update(listings)
        .set({
          status,
          deactivatedAt: status === 'paused' || status === 'closed' ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(listings.id, listingId))
        .returning();
      if (!changed) {
        return null;
      }
      for (const event of eventsFactory?.(changed) ?? []) {
        await this.outbox.add(event, tx);
      }
      return changed;
    });
  }

  async trackAnalyticsEvent(
    listingId: string,
    input: {
      eventType: ListingInteractionType;
      value: number;
      actorUserId?: string;
      metadata: Record<string, unknown>;
    },
    events?: DomainEvent[],
  ) {
    const existing = await this.findById(listingId);
    if (!existing) {
      return null;
    }

    const next = {
      viewsCount: existing.viewsCount,
      savesCount: existing.savesCount,
      leadsCount: existing.leadsCount,
      visitsScheduledCount: existing.visitsScheduledCount,
      applicationsCount: existing.applicationsCount,
      chatMessagesCount: existing.chatMessagesCount,
    };
    if (input.eventType === 'view') next.viewsCount += input.value;
    if (input.eventType === 'save') next.savesCount += input.value;
    if (input.eventType === 'lead') next.leadsCount += input.value;
    if (input.eventType === 'visit_scheduled') next.visitsScheduledCount += input.value;
    if (input.eventType === 'application') next.applicationsCount += input.value;
    if (input.eventType === 'chat_message') next.chatMessagesCount += input.value;

    return this.drizzle.db.transaction(async (tx) => {
      await tx.insert(listingAnalyticsEvents).values({
        listingId,
        eventType: input.eventType,
        value: input.value,
        actorUserId: input.actorUserId,
        metadata: input.metadata,
        occurredAt: new Date(),
      });

      const [updated] = await tx
        .update(listings)
        .set({
          ...next,
          lastInteractionAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(listings.id, listingId))
        .returning();

      for (const event of events ?? []) {
        await this.outbox.add(event, tx);
      }
      return updated;
    });
  }

  async trackListingView(
    listingId: string,
    input: {
      actorUserId?: string;
      source: 'listings_all' | 'listing_detail' | 'search_results';
      metadata?: Record<string, unknown>;
    },
    events?: DomainEvent[],
  ) {
    return this.trackAnalyticsEvent(
      listingId,
      {
        eventType: 'view',
        value: 1,
        actorUserId: input.actorUserId,
        metadata: {
          source: input.source,
          ...(input.metadata ?? {}),
        },
      },
      events,
    );
  }

  async getAnalytics(listingId: string) {
    const listing = await this.findById(listingId);
    if (!listing) {
      return null;
    }
    const events = await this.drizzle.db
      .select()
      .from(listingAnalyticsEvents)
      .where(eq(listingAnalyticsEvents.listingId, listingId))
      .orderBy(desc(listingAnalyticsEvents.occurredAt))
      .limit(100);
    return {
      listingId,
      counters: {
        views: listing.viewsCount,
        saves: listing.savesCount,
        leads: listing.leadsCount,
        visitsScheduled: listing.visitsScheduledCount,
        applications: listing.applicationsCount,
        chatMessages: listing.chatMessagesCount,
      },
      lastInteractionAt: listing.lastInteractionAt,
      recentEvents: events,
    };
  }
}
