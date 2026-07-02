import { DrizzleService } from '@infrastructure/database/drizzle/drizzle.service';
import {
  listings,
  properties,
  propertyAvailabilityAudit,
  propertyVisits,
} from '@infrastructure/database/drizzle/schema/real-estate.schema';
import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

interface CreatePropertyInput {
  advertiserUserId: string;
  developerName?: string;
  complexName?: string;
  operationType: 'rent' | 'buy';
  rentPeriod?: 'short' | 'long' | 'indefinite';
  areaM2: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  photos: Array<{ url: string; category: string }>;
  description: string;
  cost: number;
  requirements: string[];
  availability: 'unavailable' | 'available_soon' | 'available_on_date' | 'available';
  availableFromDate?: string;
  publishedAt?: string;
  nearbyPoints: Array<{ name: string; distanceM: number; category: string }>;
  mapLocation: { lat: number; lng: number; address?: string };
}

interface UpdatePropertyInput {
  developerName?: string;
  complexName?: string;
  rentPeriod?: 'short' | 'long' | 'indefinite';
  areaM2?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  photos?: Array<{ url: string; category: string }>;
  description?: string;
  cost?: number;
  requirements?: string[];
  nearbyPoints?: Array<{ name: string; distanceM: number; category: string }>;
  mapLocation?: { lat: number; lng: number; address?: string };
}

@Injectable()
export class PropertiesRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(input: CreatePropertyInput) {
    const [created] = await this.drizzle.db
      .insert(properties)
      .values({
        advertiserUserId: input.advertiserUserId,
        developerName: input.developerName,
        complexName: input.complexName,
        operationType: input.operationType,
        rentPeriod: input.rentPeriod,
        areaM2: String(input.areaM2),
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        amenities: input.amenities,
        photos: input.photos,
        description: input.description,
        cost: String(input.cost),
        requirements: input.requirements,
        availability: input.availability,
        publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
        nearbyPoints: input.nearbyPoints,
        mapLocation: input.mapLocation,
        metadata: input.availableFromDate
          ? {
              availableFromDate: input.availableFromDate,
            }
          : {},
      })
      .returning();
    return created;
  }

  async findAllVisible(viewerUserId?: string) {
    const all = await this.drizzle.db.select().from(properties).orderBy(desc(properties.createdAt));
    if (!viewerUserId) {
      return all.filter((property) => property.availability !== 'unavailable');
    }
    const result = await Promise.all(
      all.map(async (property) => {
        if (property.availability !== 'unavailable') {
          return property;
        }
        const latestListing = await this.getLatestListingByProperty(property.id);
        if (!latestListing?.deactivatedAt) {
          return null;
        }
        const extensionEndsAt = new Date(latestListing.deactivatedAt);
        extensionEndsAt.setDate(extensionEndsAt.getDate() + 7);
        if (new Date() > extensionEndsAt) {
          return null;
        }
        const [visit] = await this.drizzle.db
          .select()
          .from(propertyVisits)
          .where(
            and(
              eq(propertyVisits.propertyId, property.id),
              eq(propertyVisits.userId, viewerUserId),
            ),
          )
          .limit(1);
        return visit ? property : null;
      }),
    );
    return result.filter((item): item is NonNullable<typeof item> => item !== null);
  }

  async findByIdVisible(propertyId: string, viewerUserId?: string) {
    const [property] = await this.drizzle.db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);
    if (!property) {
      return null;
    }
    if (property.availability !== 'unavailable') {
      return property;
    }
    if (!viewerUserId) {
      return null;
    }
    const latestListing = await this.getLatestListingByProperty(property.id);
    if (!latestListing?.deactivatedAt) {
      return null;
    }
    const extensionEndsAt = new Date(latestListing.deactivatedAt);
    extensionEndsAt.setDate(extensionEndsAt.getDate() + 7);
    if (new Date() > extensionEndsAt) {
      return null;
    }
    const [visit] = await this.drizzle.db
      .select()
      .from(propertyVisits)
      .where(
        and(eq(propertyVisits.propertyId, property.id), eq(propertyVisits.userId, viewerUserId)),
      )
      .limit(1);
    return visit ? property : null;
  }

  async update(propertyId: string, input: UpdatePropertyInput) {
    const [updated] = await this.drizzle.db
      .update(properties)
      .set({
        developerName: input.developerName,
        complexName: input.complexName,
        rentPeriod: input.rentPeriod,
        areaM2: input.areaM2 !== undefined ? String(input.areaM2) : undefined,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
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

  async remove(propertyId: string): Promise<void> {
    await this.drizzle.db.delete(properties).where(eq(properties.id, propertyId));
  }

  async registerVisit(propertyId: string, userId: string): Promise<void> {
    await this.drizzle.db.insert(propertyVisits).values({
      propertyId,
      userId,
      visitedAt: new Date(),
    });
  }

  async changeAvailability(input: {
    propertyId: string;
    toStatus: 'unavailable' | 'available_soon' | 'available_on_date' | 'available';
    reason: string;
    changedByUserId: string;
    availableFromDate?: string;
  }) {
    const [current] = await this.drizzle.db
      .select()
      .from(properties)
      .where(eq(properties.id, input.propertyId))
      .limit(1);
    if (!current) {
      return null;
    }

    await this.drizzle.db.insert(propertyAvailabilityAudit).values({
      propertyId: input.propertyId,
      changedByUserId: input.changedByUserId,
      fromStatus: current.availability,
      toStatus: input.toStatus,
      reason: input.reason,
      changedAt: new Date(),
    });

    const nextMetadata = {
      ...(current.metadata as Record<string, unknown>),
      availableFromDate: input.availableFromDate,
    };

    const [updated] = await this.drizzle.db
      .update(properties)
      .set({
        availability: input.toStatus,
        metadata: nextMetadata,
        updatedAt: new Date(),
      })
      .where(eq(properties.id, input.propertyId))
      .returning();

    if (input.toStatus === 'unavailable') {
      await this.drizzle.db
        .update(listings)
        .set({
          status: 'paused',
          deactivatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(listings.propertyId, input.propertyId));
    }
    return updated;
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
