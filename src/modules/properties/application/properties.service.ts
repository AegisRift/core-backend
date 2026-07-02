import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { EVENT_TOPICS } from '../../../events/contracts/integration-events/keuwo-events.examples';
import { buildDomainEvent } from '../../../shared/domain/events/build-domain-event';
import { ChangePropertyAvailabilityDto } from '../api/http/dto/change-property-availability.dto';
import { CreatePropertyDto } from '../api/http/dto/create-property.dto';
import { UpdatePropertyDto } from '../api/http/dto/update-property.dto';
import { PropertiesRepository } from '../infrastructure/persistence/properties.repository';

@Injectable()
export class PropertiesService {
  constructor(private readonly propertiesRepository: PropertiesRepository) {}

  create(body: CreatePropertyDto) {
    return this.propertiesRepository.create(
      {
        ...body,
        availability: body.availability ?? 'available',
      },
      (created) => [
        buildDomainEvent({
          eventType: EVENT_TOPICS.PROPERTY_CREATED,
          aggregateId: created.id,
          payload: {
            propertyId: created.id,
            advertiserUserId: created.advertiserUserId,
            developerId: created.developerId ?? undefined,
            operationType: created.operationType,
            cost: Number(created.cost),
            country: body.mapLocation.country,
            city: body.mapLocation.city,
          },
        }),
      ],
    );
  }

  findAll(viewerUserId?: string) {
    return this.propertiesRepository.findAllVisible(viewerUserId);
  }

  async findById(propertyId: string, viewerUserId?: string) {
    const property = await this.propertiesRepository.findByIdVisible(propertyId, viewerUserId);
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return property;
  }

  async publish(propertyId: string) {
    const property = await this.propertiesRepository.findById(propertyId);
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.status === 'published') {
      throw new ConflictException('Property is already published');
    }
    const published = await this.propertiesRepository.publish(propertyId, (row) => [
      buildDomainEvent({
        eventType: EVENT_TOPICS.PROPERTY_PUBLISHED,
        aggregateId: row.id,
        payload: {
          propertyId: row.id,
          advertiserUserId: row.advertiserUserId,
          operationType: row.operationType,
          cost: Number(row.cost),
          publishedAt: row.publishedAt?.toISOString(),
        },
      }),
    ]);
    if (!published) {
      throw new ConflictException('Property cannot be published from its current status');
    }
    return published;
  }

  async update(propertyId: string, body: UpdatePropertyDto) {
    const updated = await this.propertiesRepository.update(propertyId, body);
    if (!updated) {
      throw new NotFoundException('Property not found');
    }
    return updated;
  }

  async remove(propertyId: string) {
    await this.propertiesRepository.remove(propertyId);
    return { success: true };
  }

  async registerVisit(propertyId: string, userId: string) {
    const property = await this.findById(propertyId, userId);
    await this.propertiesRepository.registerVisit(propertyId, userId, () => [
      buildDomainEvent({
        eventType: EVENT_TOPICS.PROPERTY_VISIT_REGISTERED,
        aggregateId: propertyId,
        payload: {
          propertyId,
          userId,
          operationType: property.operationType,
          cost: Number(property.cost),
          country: (property.mapLocation as { country?: string })?.country,
          city: (property.mapLocation as { city?: string })?.city,
        },
      }),
    ]);
    return { success: true };
  }

  async changeAvailability(
    propertyId: string,
    body: ChangePropertyAvailabilityDto,
    actorUserId?: string,
  ) {
    const changedByUserId = actorUserId ?? body.changedByUserId ?? 'system';
    const changed = await this.propertiesRepository.changeAvailability(
      {
        propertyId,
        toStatus: body.toStatus,
        reason: body.reason,
        changedByUserId,
        availableFromDate: body.availableFromDate,
      },
      (row) => [
        buildDomainEvent({
          eventType: EVENT_TOPICS.PROPERTY_AVAILABILITY_CHANGED,
          aggregateId: propertyId,
          payload: {
            propertyId,
            toStatus: body.toStatus,
            reason: body.reason,
            changedByUserId,
            availability: row?.availability,
          },
        }),
      ],
    );
    if (!changed) {
      throw new NotFoundException('Property not found');
    }
    return changed;
  }
}
