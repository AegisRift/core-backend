import { Injectable, NotFoundException } from '@nestjs/common';

import { ChangeListingStatusDto } from '../api/http/dto/change-listing-status.dto';
import { CreateListingDto } from '../api/http/dto/create-listing.dto';
import { UpdateListingDto } from '../api/http/dto/update-listing.dto';
import { ListingsDrizzleRepository } from '../infrastructure/persistence/listings.drizzle.repository';

@Injectable()
export class ListingsService {
  constructor(private readonly listingsRepository: ListingsDrizzleRepository) {}

  private haversineDistanceKm(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
  ): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(to.lat - from.lat);
    const dLng = toRad(to.lng - from.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  }

  create(body: CreateListingDto) {
    return this.listingsRepository.create(body);
  }

  async findAll(viewerUserId?: string) {
    const rows = await this.listingsRepository.findAllAvailable();
    await Promise.all(
      rows.map((row) =>
        this.listingsRepository.trackListingView(row.listing.id, {
          actorUserId: viewerUserId,
          source: 'listings_all',
        }),
      ),
    );
    return rows;
  }

  async findById(listingId: string, viewerUserId?: string) {
    const row = await this.listingsRepository.findByIdAvailable(listingId);
    if (!row) {
      throw new NotFoundException('Listing not found');
    }
    await this.listingsRepository.trackListingView(row.listing.id, {
      actorUserId: viewerUserId,
      source: 'listing_detail',
      metadata: { clickedFromFeed: true },
    });
    return row;
  }

  async update(listingId: string, body: UpdateListingDto) {
    const updated = await this.listingsRepository.update(listingId, body);
    if (!updated) {
      throw new NotFoundException('Listing not found');
    }
    return updated;
  }

  async remove(listingId: string) {
    await this.listingsRepository.remove(listingId);
    return { success: true };
  }

  async changeStatus(listingId: string, body: ChangeListingStatusDto) {
    const changed = await this.listingsRepository.changeStatus(listingId, body.status);
    if (!changed) {
      throw new NotFoundException('Listing not found');
    }
    return changed;
  }

  async getAnalytics(listingId: string) {
    const analytics = await this.listingsRepository.getAnalytics(listingId);
    if (!analytics) {
      throw new NotFoundException('Listing not found');
    }
    return analytics;
  }

  async getFeed(input?: { userId?: string; limit?: number }) {
    const request = input ?? {};
    const candidates = await this.listingsRepository.getFeedCandidates();

    let profile: { userType: string | null; country: string | null } | null = null;
    let searchHistory: Array<{
      operationType: string | null;
      country: string | null;
      city: string | null;
      minPrice: string | null;
      maxPrice: string | null;
      distanceRangeKm: string | null;
      userLat: string | null;
      userLng: string | null;
    }> = [];
    if (request.userId) {
      profile = await this.listingsRepository.getUserProfile(request.userId);
      searchHistory = await this.listingsRepository.getRecentSearchHistory(request.userId);
    }

    const preferredOperation =
      searchHistory.find((h) => h.operationType)?.operationType ??
      (profile?.userType === 'buyer' || profile?.userType === 'investor' ? 'buy' : 'rent');
    const preferredCountry =
      searchHistory.find((h) => h.country)?.country ?? profile?.country ?? undefined;
    const preferredCity = searchHistory.find((h) => h.city)?.city ?? undefined;
    const preferredDistanceRangeKm =
      Number(searchHistory.find((h) => h.distanceRangeKm)?.distanceRangeKm ?? 0) || undefined;
    const preferredUserLat = Number(searchHistory.find((h) => h.userLat)?.userLat ?? NaN);
    const preferredUserLng = Number(searchHistory.find((h) => h.userLng)?.userLng ?? NaN);
    const historyPrices = searchHistory
      .map((h) => Number(h.maxPrice ?? h.minPrice ?? 0))
      .filter((value) => value > 0);
    const avgPriceFromHistory =
      historyPrices.length > 0
        ? historyPrices.reduce((acc, val) => acc + val, 0) / historyPrices.length
        : undefined;

    const scored = candidates.map((row) => {
      const listingPrice = Number(row.listing.price);
      let score = 0.2;
      if (preferredOperation && row.property.operationType === preferredOperation) {
        score += 0.25;
      }
      if (
        preferredCountry &&
        String((row.property.mapLocation as { country?: string })?.country ?? '').toLowerCase() ===
          preferredCountry.toLowerCase()
      ) {
        score += 0.15;
      }
      if (
        preferredCity &&
        String((row.property.mapLocation as { city?: string })?.city ?? '').toLowerCase() ===
          preferredCity.toLowerCase()
      ) {
        score += 0.12;
      }
      if (avgPriceFromHistory !== undefined) {
        const delta =
          Math.abs(listingPrice - avgPriceFromHistory) / Math.max(avgPriceFromHistory, 1);
        score += Math.max(0, 0.2 - delta * 0.2);
      }
      const popularity =
        row.listing.viewsCount * 0.4 +
        row.listing.savesCount * 0.8 +
        row.listing.leadsCount * 1.2 +
        row.listing.applicationsCount * 1.5;
      score += Math.min(0.3, popularity / 1000);

      const mapLocation = row.property.mapLocation as { lat?: number; lng?: number };
      const hasGeoContext =
        Number.isFinite(preferredUserLat) &&
        Number.isFinite(preferredUserLng) &&
        Number.isFinite(mapLocation.lat) &&
        Number.isFinite(mapLocation.lng);
      let distanceKm: number | undefined;
      if (hasGeoContext) {
        distanceKm = this.haversineDistanceKm(
          { lat: Number(preferredUserLat), lng: Number(preferredUserLng) },
          { lat: Number(mapLocation.lat), lng: Number(mapLocation.lng) },
        );
        const range = preferredDistanceRangeKm ?? 25;
        if (distanceKm <= range) {
          score += 0.15;
        } else {
          const overflow = Math.min(1, (distanceKm - range) / Math.max(range, 1));
          score -= overflow * 0.1;
        }
      }

      const normalizedScore = Math.max(0, Math.min(1, score));
      const clickProbability = 1 / (1 + Math.exp(-(-1 + normalizedScore * 2.6)));
      return {
        ...row,
        distanceKm: distanceKm !== undefined ? Number(distanceKm.toFixed(2)) : null,
        matchScore: Number(normalizedScore.toFixed(4)),
        clickProbability: Number(clickProbability.toFixed(4)),
      };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore || b.clickProbability - a.clickProbability);
    const limit = request.limit ?? 20;
    const feed = scored.slice(0, limit);
    await Promise.all(
      feed.map((entry) =>
        this.listingsRepository.trackListingView(entry.listing.id, {
          actorUserId: request.userId,
          source: 'listings_feed',
          metadata: {
            matchScore: entry.matchScore,
            clickProbability: entry.clickProbability,
          },
        }),
      ),
    );
    return feed;
  }
}
