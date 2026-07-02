import { DrizzleService } from '@infrastructure/database/drizzle/drizzle.service';
import {
  listings,
  properties,
  propertyAvailabilityAudit,
  propertyVisits,
} from '@infrastructure/database/drizzle/schema/real-estate.schema';
import { OutboxRepository } from '@infrastructure/messaging/outbox/outbox.repository';
import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { DomainEvent } from '../../../../shared/domain/events/domain-event';

export type PropertyRow = typeof properties.$inferSelect;

interface CreatePropertyInput {
  advertiserUserId: string;
  developerName?: string;
  developerId?: string;
  complexName?: string;
  operationType: 'rent' | 'buy';
  rentPeriod?: 'short' | 'long' | 'indefinite';
  areaM2: number;
  bedrooms: number;
  /** Supports half baths, e.g. 2.5. */
  bathrooms: number;
  furnished: boolean;
  amenities: string[];
  photos: Array<{ url: string; category: string }>;
  description: string;
  cost: number;
  requirements: string[];
  availability: 'unavailable' | 'available_soon' | 'available_on_date' | 'available';
  availableFromDate?: string;
  nearbyPoints: Array<{ name: string; distanceM: number; category: string }>;
  mapLocation: { lat: number; lng: number; address?: string; country: string; city: string };
}

interface UpdatePropertyInput {
  developerName?: string;
  developerId?: string;
  complexName?: string;
  rentPeriod?: 'short' | 'long' | 'indefinite';
  areaM2?: number;
  bedrooms?: number;
  /** Supports half baths, e.g. 2.5. */
  bathrooms?: number;
  furnished?: boolean;
  amenities?: string[];
  photos?: Array<{ url: string; category: string }>;
  description?: string;
  cost?: number;
  requirements?: string[];
  nearbyPoints?: Array<{ name: string; distanceM: number; category: string }>;
  mapLocation?: { lat: number; lng: number; address?: string; country: string; city: string };
}

type EventsFactory<TRow> = (row: TRow) => DomainEvent[];

@Injectable()
export class PropertiesRepository {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly outbox: OutboxRepository,
  ) {}

  async create(input: CreatePropertyInput, eventsFactory?: EventsFactory<PropertyRow>) {
    return this.drizzle.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(properties)
        .values({
          advertiserUserId: input.advertiserUserId,
          developerName: input.developerName,
          developerId: input.developerId,
          complexName: input.complexName,
          status: 'draft',
          operationType: input.operationType,
          rentPeriod: input.rentPeriod,
          areaM2: String(input.areaM2),
          bedrooms: input.bedrooms,
          bathrooms: String(input.bathrooms),
          furnished: input.furnished,
          amenities: input.amenities,
          photos: input.photos,
          description: input.description,
          cost: String(input.cost),
          requirements: input.requirements,
          availability: input.availability,
          availableFromDate: input.availableFromDate ? new Date(input.availableFromDate) : null,
          publishedAt: null,
          nearbyPoints: input.nearbyPoints,
          mapLocation: input.mapLocation,
          metadata: {},
        })
        .returning();
      for (const event of eventsFactory?.(created) ?? []) {
        await this.outbox.add(event, tx);
      }
      return created;
    });
  }

  async findAllVisible(viewerUserId?: string) {
    const all = await this.drizzle.db.select().from(properties).orderBy(desc(properties.createdAt));
    const result = await Promise.all(
      all.map(async (property) => {
        if (property.status !== 'published') {
          return viewerUserId && property.advertiserUserId === viewerUserId ? property : null;
        }
        if (property.availability !== 'unavailable') {
          return property;
        }
        if (!viewerUserId) {
          return null;
        }
        return (await this.isVisibleAfterDeactivation(property.id, viewerUserId)) ? property : null;
      }),
    );
    return result.filter((item): item is NonNullable<typeof item> => item !== null);
  }

  async findByIdVisible(propertyId: string, viewerUserId?: string) {
    const property = await this.findById(propertyId);
    if (!property) {
      return null;
    }
    if (property.status !== 'published') {
      return viewerUserId && property.advertiserUserId === viewerUserId ? property : null;
    }
    if (property.availability !== 'unavailable') {
      return property;
    }
    if (!viewerUserId) {
      return null;
    }
    return (await this.isVisibleAfterDeactivation(property.id, viewerUserId)) ? property : null;
  }

  async findById(propertyId: string) {
    const [property] = await this.drizzle.db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);
    return property ?? null;
  }

  async update(propertyId: string, input: UpdatePropertyInput) {
    const [updated] = await this.drizzle.db
      .update(properties)
      .set({
        developerName: input.developerName,
        developerId: input.developerId,
        complexName: input.complexName,
        rentPeriod: input.rentPeriod,
        areaM2: input.areaM2 !== undefined ? String(input.areaM2) : undefined,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms !== undefined ? String(input.bathrooms) : undefined,
        furnished: input.furnished,
        amenities: input.amenities,
        photos: input.photos,
        description: input.description,
        cost: input.cost !== undefined ? String(input.cost) : undefined,
        requirements: input.requirements,
        nearbyPoints: input.nearbyPoints,
        mapLocation: input.mapLocation,
        updatedAt: new Date(),
      })
      .where(eq(properties.id, propertyId))
      .returning();
    return updated;
  }

  async publish(propertyId: string, eventsFactory?: EventsFactory<PropertyRow>) {
    return this.drizzle.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(properties)
        .set({
          status: 'published',
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(properties.id, propertyId), eq(properties.status, 'draft')))
        .returning();
      if (!updated) {
        return null;
      }
      for (const event of eventsFactory?.(updated) ?? []) {
        await this.outbox.add(event, tx);
      }
      return updated;
    });
  }

  async remove(propertyId: string): Promise<void> {
    await this.drizzle.db.delete(properties).where(eq(properties.id, propertyId));
  }

  async registerVisit(
    propertyId: string,
    userId: string,
    eventsFactory?: EventsFactory<void>,
  ): Promise<void> {
    await this.drizzle.db.transaction(async (tx) => {
      await tx.insert(propertyVisits).values({
        propertyId,
        userId,
        visitedAt: new Date(),
      });
      for (const event of eventsFactory?.() ?? []) {
        await this.outbox.add(event, tx);
      }
    });
  }

  async changeAvailability(
    input: {
      propertyId: string;
      toStatus: 'unavailable' | 'available_soon' | 'available_on_date' | 'available';
      reason: string;
      changedByUserId: string;
      availableFromDate?: string;
    },
    eventsFactory?: EventsFactory<PropertyRow>,
  ) {
    const current = await this.findById(input.propertyId);
    if (!current) {
      return null;
    }

    return this.drizzle.db.transaction(async (tx) => {
      await tx.insert(propertyAvailabilityAudit).values({
        propertyId: input.propertyId,
        changedByUserId: input.changedByUserId,
        fromStatus: current.availability,
        toStatus: input.toStatus,
        reason: input.reason,
        changedAt: new Date(),
      });

      const [updated] = await tx
        .update(properties)
        .set({
          availability: input.toStatus,
          availableFromDate: input.availableFromDate ? new Date(input.availableFromDate) : null,
          updatedAt: new Date(),
        })
        .where(eq(properties.id, input.propertyId))
        .returning();

      if (input.toStatus === 'unavailable') {
        await tx
          .update(listings)
          .set({
            status: 'paused',
            deactivatedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(eq(listings.propertyId, input.propertyId), eq(listings.status, 'published')));
      }

      for (const event of eventsFactory?.(updated) ?? []) {
        await this.outbox.add(event, tx);
      }
      return updated;
    });
  }

  /**
   * A property marked unavailable stays visible for 7 days after its latest
   * listing was deactivated, but only for users who visited it.
   */
  private async isVisibleAfterDeactivation(
    propertyId: string,
    viewerUserId: string,
  ): Promise<boolean> {
    const latestListing = await this.getLatestListingByProperty(propertyId);
    if (!latestListing?.deactivatedAt) {
      return false;
    }
    const extensionEndsAt = new Date(latestListing.deactivatedAt);
    extensionEndsAt.setDate(extensionEndsAt.getDate() + 7);
    if (new Date() > extensionEndsAt) {
      return false;
    }
    const [visit] = await this.drizzle.db
      .select()
      .from(propertyVisits)
      .where(
        and(eq(propertyVisits.propertyId, propertyId), eq(propertyVisits.userId, viewerUserId)),
      )
      .limit(1);
    return Boolean(visit);
  }

  private async getLatestListingByProperty(propertyId: string) {
    const [listing] = await this.drizzle.db
      .select()
      .from(listings)
      .where(eq(listings.propertyId, propertyId))
      .orderBy(desc(listings.updatedAt))
      .limit(1);
    return listing;
  }
}
