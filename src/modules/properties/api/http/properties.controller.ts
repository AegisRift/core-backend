import { PropertiesService } from '@modules/properties/application/properties.service';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';

import { ChangePropertyAvailabilityDto } from './dto/change-property-availability.dto';
import { CreatePropertyDto } from './dto/create-property.dto';
import { RegisterPropertyVisitDto } from './dto/register-property-visit.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  create(@Body() body: CreatePropertyDto) {
    return this.propertiesService.create(body);
  }

  @Get()
  findAll(@Query('viewerUserId') viewerUserId?: string) {
    return this.propertiesService.findAll(viewerUserId);
  }

  @Get(':id')
  findById(
    @Param('id') propertyId: string,
    @Req() request: Request,
    @Query('viewerUserId') viewerUserIdFromQuery?: string,
  ) {
    const viewerFromToken = (request.user as { userId?: string } | undefined)?.userId;
    const viewerUserId = viewerUserIdFromQuery ?? viewerFromToken;
    return this.propertiesService.findById(propertyId, viewerUserId);
  }

  @Post(':id/publish')
  publish(@Param('id') propertyId: string) {
    return this.propertiesService.publish(propertyId);
  }

  @Patch(':id')
  update(@Param('id') propertyId: string, @Body() body: UpdatePropertyDto) {
    return this.propertiesService.update(propertyId, body);
  }

  @Patch(':id/availability')
  changeAvailability(
    @Param('id') propertyId: string,
    @Body() body: ChangePropertyAvailabilityDto,
    @Req() request: Request,
  ) {
    const actorUserId = (request.user as { userId?: string } | undefined)?.userId;
    return this.propertiesService.changeAvailability(propertyId, body, actorUserId);
  }

  @Post(':id/visits')
  registerVisit(@Param('id') propertyId: string, @Body() body: RegisterPropertyVisitDto) {
    return this.propertiesService.registerVisit(propertyId, body.userId);
  }

  @Delete(':id')
  remove(@Param('id') propertyId: string) {
    return this.propertiesService.remove(propertyId);
  }
}
