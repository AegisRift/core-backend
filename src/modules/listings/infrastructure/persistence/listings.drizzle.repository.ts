import { Injectable } from '@nestjs/common';
import { and, desc, eq, ne } from 'drizzle-orm';

import { DrizzleService } from '@infrastructure/database/drizzle/drizzle.service';
import { authUsers } from '@infrastructure/database/drizzle/schema/auth.schema';
import {
  listingAnalyticsEvents,
  listingSearchHistory,
  listings,
  properties,
} from '@infrastructure/database/drizzle/schema/real-estate.schema';

import { CreateListingDto } from '../../api/http/dto/create-listing.dto';
import { UpdateListingDto } from '../../api/http/dto/update-listing.dto';
import { ListingsRepositoryPort } from '../../application/ports/listings.repository.port';
import { ListingEntity } from '../../domain/entities/listing.entity';

@Injectable()
export class ListingsDrizzleRepository implements ListingsRepositoryPort {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(body: CreateListingDto) {
    const [created] = await this.drizzle.db
      .insert(listings)
      .values({
        propertyId: body.propertyId,
        title: body.title,
        summary: body.summary,
        price: String(body.price),
        status: 'available',
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : new Date(),
        metadata: body.metadata ?? {},
      })
      .returning();
    return created;
  }

  async findAll() {
    return this.drizzle.db.select().from(listings).orderBy(desc(listings.createdAt));
  }

  async findAllAvailable() {
    return this.drizzle.db
      .select({
        listing: listings,
        property: properties,
      })
      .from(listings)
      .innerJoin(properties, eq(properties.id, listings.propertyId))
      .where(and(eq(listings.status, 'available'), ne(properties.availability, 'unavailable')))
      .orderBy(desc(listings.createdAt));
  }

  async findById(listingId: string) {
    const [listing] = await this.drizzle.db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    return listing;
  }

  async findByIdAvailable(listingId: string) {
    const [row] = await this.drizzle.db
      .select({
        listing: listings,
        property: properties,
      })
      .from(listings)
      .innerJoin(properties, eq(properties.id, listings.propertyId))
      .where(eq(listings.id, listingId))
      .limit(1);
    if (!row || row.listing.status !== 'available' || row.property.availability === 'unavailable') {
      return null;
    }
    return row;
  }

  async update(listingId: string, body: UpdateListingDto) {
    const [updated] = await this.drizzle.db
      .update(listings)
      .set({
        title: body.title,
        summary: body.summary,
        price: body.price !== undefined ? String(body.price) : undefined,
        metadata: body.metadata,
        updatedAt: new Date(),
      })
      .where(eq(listings.id, listingId))
      .returning();
    return updated;
  }

  async remove(listingId: string): Promise<void> {
    await this.drizzle.db.delete(listings).where(eq(listings.id, listingId));
  }

  async changeStatus(listingId: string, status: 'paused' | 'available') {
    const [changed] = await this.drizzle.db
      .update(listings)
      .set({
        status,
        deactivatedAt: status === 'paused' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(listings.id, listingId))
      .returning();
    return changed;
  }

  async trackAnalyticsEvent(
    listingId: string,
    input: {
      eventType: 'view' | 'save' | 'lead' | 'visit_scheduled' | 'application' | 'chat_message';
      value: number;
      actorUserId?: string;
      metadata: Record<string, unknown>;
    },
  ) {
    const existing = await this.findById(listingId);
    if (!existing) {
      return null;
    }

    await this.drizzle.db.insert(listingAnalyticsEvents).values({
      listingId,
      eventType: input.eventType,
      value: input.value,
      actorUserId: input.actorUserId,
      metadata: input.metadata,
      occurredAt: new Date(),
    });

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

    const [updated] = await this.drizzle.db
      .update(listings)
      .set({
        ...next,
        lastInteractionAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(listings.id, listingId))
      .returning();
    return updated;
  }

  async trackListingView(
    listingId: string,
    input: {
      actorUserId?: string;
      source: 'listings_all' | 'listing_detail' | 'listings_feed';
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.trackAnalyticsEvent(listingId, {
      eventType: 'view',
      value: 1,
      actorUserId: input.actorUserId,
      metadata: {
        source: input.source,
        ...(input.metadata ?? {}),
      },
    });
  }

  async recordSearchHistory(input: {
    userId: string;
    queryText?: string;
    operationType?: string;
    minPrice?: number;
    maxPrice?: number;
    country?: string;
    city?: string;
    distanceRangeKm?: number;
    userLat?: number;
    userLng?: number;
    bedrooms?: number;
  }) {
    await this.drizzle.db.insert(listingSearchHistory).values({
      userId: input.userId,
      queryText: input.queryText,
      operationType: input.operationType,
      minPrice: input.minPrice !== undefined ? String(input.minPrice) : null,
      maxPrice: input.maxPrice !== undefined ? String(input.maxPrice) : null,
      country: input.country,
      city: input.city,
      distanceRangeKm: input.distanceRangeKm !== undefined ? String(input.distanceRangeKm) : null,
      userLat: input.userLat !== undefined ? String(input.userLat) : null,
      userLng: input.userLng !== undefined ? String(input.userLng) : null,
      bedrooms: input.bedrooms,
      createdAt: new Date(),
    });
  }

  async getRecentSearchHistory(userId: string) {
    return this.drizzle.db
      .select()
      .from(listingSearchHistory)
      .where(eq(listingSearchHistory.userId, userId))
      .orderBy(desc(listingSearchHistory.createdAt))
      .limit(20);
  }

  async getUserProfile(userId: string) {
    const [user] = await this.drizzle.db
      .select()
      .from(authUsers)
      .where(eq(authUsers.id, userId))
      .limit(1);
    return user;
  }

  async getFeedCandidates(filters?: {
    operationType?: string;
    minPrice?: number;
    maxPrice?: number;
    country?: string;
    city?: string;
    bedrooms?: number;
  }) {
    const rows = await this.findAllAvailable();
    return rows.filter((row) => {
      if (!filters) {
        return true;
      }
      const price = Number(row.listing.price);
      if (filters.operationType && row.property.operationType !== filters.operationType) {
        return false;
      }
      if (filters.minPrice !== undefined && price < filters.minPrice) {
        return false;
      }
      if (filters.maxPrice !== undefined && price > filters.maxPrice) {
        return false;
      }
      if (
        filters.country &&
        String((row.property.mapLocation as { country?: string })?.country ?? '').toLowerCase() !==
          filters.country.toLowerCase()
      ) {
        return false;
      }
      if (
        filters.city &&
        String((row.property.mapLocation as { city?: string })?.city ?? '').toLowerCase() !==
          filters.city.toLowerCase()
      ) {
        return false;
      }
      if (filters.bedrooms !== undefined && row.property.bedrooms < filters.bedrooms) {
        return false;
      }
      return true;
    });
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

  async save(entity: ListingEntity): Promise<void> {
    await this.drizzle.db.insert(listings).values({
      id: entity.id,
      propertyId: entity.propertyId,
      title: entity.title,
      price: String(entity.price),
      status: entity.currentStatus === 'published' ? 'available' : 'paused',
      publishedAt: new Date(),
      metadata: {},
    });
  }
}
