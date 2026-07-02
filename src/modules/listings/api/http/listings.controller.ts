import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';

import { ListingsService } from '../../application/listings.service';

import { ChangeListingStatusDto } from './dto/change-listing-status.dto';
import { CreateListingDto } from './dto/create-listing.dto';
import { TrackListingAnalyticsEventDto } from './dto/track-listing-analytics-event.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Post()
  async create(@Body() body: CreateListingDto) {
    return this.listingsService.create(body);
  }

  @Get()
  findAll(@Query('viewerUserId') viewerUserId?: string) {
    return this.listingsService.findAll(viewerUserId);
  }

  @Get(':id')
  findById(
    @Param('id') listingId: string,
    @Req() request: Request,
    @Query('viewerUserId') viewerUserIdFromQuery?: string,
  ) {
    const viewerFromToken = (request.user as { userId?: string } | undefined)?.userId;
    const viewerUserId = viewerUserIdFromQuery ?? viewerFromToken;
    return this.listingsService.findById(listingId, viewerUserId);
  }

  @Post(':id/publish')
  publish(@Param('id') listingId: string) {
    return this.listingsService.publish(listingId);
  }

  @Post(':id/events')
  trackInteraction(@Param('id') listingId: string, @Body() body: TrackListingAnalyticsEventDto) {
    return this.listingsService.trackInteraction(listingId, body);
  }

  @Patch(':id')
  update(@Param('id') listingId: string, @Body() body: UpdateListingDto) {
    return this.listingsService.update(listingId, body);
  }

  @Patch(':id/status')
  changeStatus(@Param('id') listingId: string, @Body() body: ChangeListingStatusDto) {
    return this.listingsService.changeStatus(listingId, body);
  }

  @Get(':id/analytics')
  getAnalytics(@Param('id') listingId: string) {
    return this.listingsService.getAnalytics(listingId);
  }

  @Delete(':id')
  remove(@Param('id') listingId: string) {
    return this.listingsService.remove(listingId);
  }
}
