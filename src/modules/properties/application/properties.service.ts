import { Injectable, NotFoundException } from '@nestjs/common';

import { ChangePropertyAvailabilityDto } from '../api/http/dto/change-property-availability.dto';
import { CreatePropertyDto } from '../api/http/dto/create-property.dto';
import { UpdatePropertyDto } from '../api/http/dto/update-property.dto';
import { PropertiesRepository } from '../infrastructure/persistence/properties.repository';

@Injectable()
export class PropertiesService {
  constructor(private readonly propertiesRepository: PropertiesRepository) {}

  create(body: CreatePropertyDto) {
    return this.propertiesRepository.create({
      ...body,
      availability: body.availability ?? 'available',
    });
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
    await this.findById(propertyId, userId);
    await this.propertiesRepository.registerVisit(propertyId, userId);
    return { success: true };
  }

  async changeAvailability(
    propertyId: string,
    body: ChangePropertyAvailabilityDto,
    actorUserId?: string,
  ) {
    const changed = await this.propertiesRepository.changeAvailability({
      propertyId,
      toStatus: body.toStatus,
      reason: body.reason,
      changedByUserId: actorUserId ?? body.changedByUserId ?? 'system',
      availableFromDate: body.availableFromDate,
    });
    if (!changed) {
      throw new NotFoundException('Property not found');
    }
    return changed;
  }
}
