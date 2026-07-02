import { DrizzleService } from '@infrastructure/database/drizzle/drizzle.service';
import {
  listingSearchHistory,
  listings,
  properties,
} from '@infrastructure/database/drizzle/schema/real-estate.schema';
import { Injectable } from '@nestjs/common';
import { buildPaginatedResult, DEFAULT_PAGE_SIZE } from '@shared/application/pagination/pagination';
import { and, desc, eq, ne, sql, SQL } from 'drizzle-orm';

export interface PaginationInput {
  page?: number;
  pageSize?: number;
}

export interface SearchListingsFilters {
  q?: string;
  operationType?: 'rent' | 'buy';
  dealType?: 'direct_owner' | 'owner_administrator' | 'real_estate_agency' | 'developer';
  developerId?: string;
  furnished?: boolean;
  rentPeriod?: 'short' | 'long' | 'indefinite';
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  /** Supports half baths, e.g. 2.5. */
  bathrooms?: number;
  minAreaM2?: number;
  maxAreaM2?: number;
  country?: string;
  city?: string;
  amenities?: string[];
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sortBy?: 'relevance' | 'newest' | 'price_asc' | 'price_desc';
  page?: number;
  pageSize?: number;
}

@Injectable()
export class SearchRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async searchListings(filters: SearchListingsFilters) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

    const conditions: SQL[] = [
      eq(listings.status, 'published'),
      eq(properties.status, 'published'),
      ne(properties.availability, 'unavailable'),
    ];

    if (filters.q) {
      const like = `%${filters.q}%`;
      conditions.push(
        sql`(
          to_tsvector('simple', coalesce(${listings.title}, '') || ' ' || coalesce(${listings.summary}, '')) @@ plainto_tsquery('simple', ${filters.q})
          OR to_tsvector('simple', coalesce(${properties.description}, '')) @@ plainto_tsquery('simple', ${filters.q})
          OR ${listings.title} ILIKE ${like}
          OR ${listings.summary} ILIKE ${like}
          OR ${properties.description} ILIKE ${like}
        )`,
      );
    }
    if (filters.operationType) {
      conditions.push(eq(properties.operationType, filters.operationType));
    }
    if (filters.dealType) {
      conditions.push(eq(listings.dealType, filters.dealType));
    }
    if (filters.developerId) {
      conditions.push(eq(properties.developerId, filters.developerId));
    }
    if (filters.furnished !== undefined) {
      conditions.push(eq(properties.furnished, filters.furnished));
    }
    if (filters.rentPeriod) {
      conditions.push(eq(properties.rentPeriod, filters.rentPeriod));
    }
    if (filters.minPrice !== undefined) {
      conditions.push(sql`${listings.price} >= ${filters.minPrice}`);
    }
    if (filters.maxPrice !== undefined) {
      conditions.push(sql`${listings.price} <= ${filters.maxPrice}`);
    }
    if (filters.bedrooms !== undefined) {
      conditions.push(sql`${properties.bedrooms} >= ${filters.bedrooms}`);
    }
    if (filters.bathrooms !== undefined) {
      conditions.push(sql`${properties.bathrooms} >= ${filters.bathrooms}`);
    }
    if (filters.minAreaM2 !== undefined) {
      conditions.push(sql`${properties.areaM2} >= ${filters.minAreaM2}`);
    }
    if (filters.maxAreaM2 !== undefined) {
      conditions.push(sql`${properties.areaM2} <= ${filters.maxAreaM2}`);
    }
    if (filters.country) {
      conditions.push(
        sql`lower(${properties.mapLocation}->>'country') = ${filters.country.toLowerCase()}`,
      );
    }
    if (filters.city) {
      conditions.push(
        sql`lower(${properties.mapLocation}->>'city') = ${filters.city.toLowerCase()}`,
      );
    }
    if (filters.amenities && filters.amenities.length > 0) {
      conditions.push(sql`${properties.amenities} @> ${JSON.stringify(filters.amenities)}::jsonb`);
    }

    const hasGeo =
      filters.lat !== undefined && filters.lng !== undefined && filters.radiusKm !== undefined;
    const distanceExpr = hasGeo
      ? sql<number>`(
          6371 * acos(
            least(1.0, greatest(-1.0,
              cos(radians(${filters.lat})) * cos(radians((${properties.mapLocation}->>'lat')::double precision))
              * cos(radians((${properties.mapLocation}->>'lng')::double precision) - radians(${filters.lng}))
              + sin(radians(${filters.lat})) * sin(radians((${properties.mapLocation}->>'lat')::double precision))
            ))
          )
        )`
      : sql<number | null>`NULL`;
    if (hasGeo) {
      conditions.push(sql`${properties.mapLocation} ? 'lat' AND ${properties.mapLocation} ? 'lng'`);
      conditions.push(sql`${distanceExpr} <= ${filters.radiusKm}`);
    }

    const where = and(...conditions);

    const sortBy = filters.sortBy ?? (filters.q ? 'relevance' : 'newest');
    let orderBy: SQL;
    switch (sortBy) {
      case 'price_asc':
        orderBy = sql`${listings.price} ASC`;
        break;
      case 'price_desc':
        orderBy = sql`${listings.price} DESC`;
        break;
      case 'relevance':
        orderBy = filters.q
          ? sql`ts_rank(
              to_tsvector('simple', coalesce(${listings.title}, '') || ' ' || coalesce(${listings.summary}, '') || ' ' || coalesce(${properties.description}, '')),
              plainto_tsquery('simple', ${filters.q})
            ) DESC, ${listings.publishedAt} DESC NULLS LAST`
          : sql`${listings.publishedAt} DESC NULLS LAST`;
        break;
      case 'newest':
      default:
        orderBy = sql`${listings.publishedAt} DESC NULLS LAST`;
        break;
    }

    const items = await this.drizzle.db
      .select({
        listing: listings,
        property: properties,
        distanceKm: distanceExpr,
      })
      .from(listings)
      .innerJoin(properties, eq(properties.id, listings.propertyId))
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [{ total }] = await this.drizzle.db
      .select({ total: sql<number>`cast(count(*) as integer)` })
      .from(listings)
      .innerJoin(properties, eq(properties.id, listings.propertyId))
      .where(where);

    return buildPaginatedResult(
      items.map((row) => ({
        ...row,
        distanceKm: row.distanceKm !== null ? Number(Number(row.distanceKm).toFixed(2)) : null,
      })),
      total,
      page,
      pageSize,
    );
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
  }): Promise<void> {
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

  async getRecentSearchHistory(userId: string, pagination?: PaginationInput) {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? DEFAULT_PAGE_SIZE;

    const items = await this.drizzle.db
      .select()
      .from(listingSearchHistory)
      .where(eq(listingSearchHistory.userId, userId))
      .orderBy(desc(listingSearchHistory.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [{ total }] = await this.drizzle.db
      .select({ total: sql<number>`cast(count(*) as integer)` })
      .from(listingSearchHistory)
      .where(eq(listingSearchHistory.userId, userId));

    return buildPaginatedResult(items, total, page, pageSize);
  }
}
