import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { EVENT_TOPICS } from '../../../events/contracts/integration-events/keuwo-events.examples';
import { buildDomainEvent } from '../../../shared/domain/events/build-domain-event';
import { ChangeListingStatusDto } from '../api/http/dto/change-listing-status.dto';
import { CreateListingDto } from '../api/http/dto/create-listing.dto';
import { TrackListingAnalyticsEventDto } from '../api/http/dto/track-listing-analytics-event.dto';
import { UpdateListingDto } from '../api/http/dto/update-listing.dto';
import type {
  ListingRow,
  PropertyRow,
} from '../infrastructure/persistence/listings.drizzle.repository';

import { LISTINGS_REPOSITORY_PORT, ListingsRepositoryPort } from './ports/listings.repository.port';

@Injectable()
export class ListingsService {
  constructor(
    @Inject(LISTINGS_REPOSITORY_PORT)
    private readonly listingsRepository: ListingsRepositoryPort,
  ) {}

  async create(body: CreateListingDto) {
    const property = await this.listingsRepository.findPropertyById(body.propertyId);
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return this.listingsRepository.create(body, (created) => [
      buildDomainEvent({
        eventType: EVENT_TOPICS.LISTING_CREATED,
        aggregateId: created.id,
        payload: {
          listingId: created.id,
          propertyId: created.propertyId,
          title: created.title,
          dealType: created.dealType,
          price: Number(created.price),
        },
      }),
    ]);
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
    await this.listingsRepository.trackListingView(
      row.listing.id,
      {
        actorUserId: viewerUserId,
        source: 'listing_detail',
      },
      viewerUserId
        ? [
            this.buildInteractionEvent(
              row.listing,
              row.property,
              'view',
              viewerUserId,
              'listing_detail',
            ),
          ]
        : undefined,
    );
    return row;
  }

  async publish(listingId: string) {
    const row = await this.listingsRepository.findByIdWithProperty(listingId);
    if (!row) {
      throw new NotFoundException('Listing not found');
    }
    this.assertPropertyIsPublishable(row.property);
    if (row.listing.status === 'published') {
      throw new ConflictException('Listing is already published');
    }
    if (row.listing.status === 'closed') {
      throw new ConflictException('Closed listings cannot be published again');
    }
    const published = await this.listingsRepository.publish(listingId, (listing) => [
      buildDomainEvent({
        eventType: EVENT_TOPICS.LISTING_PUBLISHED,
        aggregateId: listing.id,
        payload: {
          listingId: listing.id,
          propertyId: listing.propertyId,
          title: listing.title,
          price: Number(listing.price),
          publishedAt: listing.publishedAt?.toISOString(),
        },
      }),
    ]);
    if (!published) {
      throw new ConflictException('Listing cannot be published from its current status');
    }
    return published;
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
    if (body.status === 'published') {
      return this.publish(listingId);
    }
    const changed = await this.listingsRepository.changeStatus(
      listingId,
      body.status,
      (listing) => [
        buildDomainEvent({
          eventType: EVENT_TOPICS.LISTING_STATUS_CHANGED,
          aggregateId: listing.id,
          payload: {
            listingId: listing.id,
            propertyId: listing.propertyId,
            status: listing.status,
          },
        }),
      ],
    );
    if (!changed) {
      throw new NotFoundException('Listing not found');
    }
    return changed;
  }

  async trackInteraction(listingId: string, body: TrackListingAnalyticsEventDto) {
    const row = await this.listingsRepository.findByIdAvailable(listingId);
    if (!row) {
      throw new NotFoundException('Listing not found');
    }
    const value = body.value ?? 1;
    const updated = await this.listingsRepository.trackAnalyticsEvent(
      listingId,
      {
        eventType: body.eventType,
        value,
        actorUserId: body.actorUserId,
        metadata: body.metadata ?? {},
      },
      body.actorUserId
        ? [
            this.buildInteractionEvent(
              row.listing,
              row.property,
              body.eventType,
              body.actorUserId,
              'interaction_api',
              body.metadata,
            ),
          ]
        : undefined,
    );
    return updated;
  }

  async getAnalytics(listingId: string) {
    const analytics = await this.listingsRepository.getAnalytics(listingId);
    if (!analytics) {
      throw new NotFoundException('Listing not found');
    }
    return analytics;
  }

  private assertPropertyIsPublishable(property: PropertyRow): void {
    if (property.status !== 'published') {
      throw new ConflictException('Property must be published before publishing a listing');
    }
    if (property.availability === 'unavailable') {
      throw new ConflictException('Property is unavailable; its listings cannot be published');
    }
  }

  private buildInteractionEvent(
    listing: ListingRow,
    property: PropertyRow,
    interactionType: 'view' | 'save' | 'lead' | 'visit_scheduled' | 'application' | 'chat_message',
    actorUserId: string,
    source: string,
    metadata?: Record<string, unknown>,
  ) {
    const mapLocation = property.mapLocation as { country?: string; city?: string };
    return buildDomainEvent({
      eventType: EVENT_TOPICS.LISTING_INTERACTION,
      aggregateId: listing.id,
      payload: {
        listingId: listing.id,
        propertyId: property.id,
        interactionType,
        actorUserId,
        source,
        context: {
          operationType: property.operationType,
          dealType: listing.dealType,
          price: Number(listing.price),
          country: mapLocation?.country,
          city: mapLocation?.city,
          bedrooms: property.bedrooms,
          furnished: property.furnished,
          amenities: property.amenities,
          ...(metadata ?? {}),
        },
      },
    });
  }
}
