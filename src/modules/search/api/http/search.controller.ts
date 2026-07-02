import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';

import { SearchService } from '../../application/search.service';

import { SearchListingsQueryDto } from './dto/search-listings.query.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('listings')
  searchListings(@Query() query: SearchListingsQueryDto, @Req() request: Request) {
    const userIdFromToken = (request.user as { userId?: string } | undefined)?.userId;
    return this.searchService.searchListings({
      ...query,
      userId: query.userId ?? userIdFromToken,
    });
  }

  @Get('history/:userId')
  getRecentSearchHistory(@Param('userId') userId: string) {
    return this.searchService.getRecentSearchHistory(userId);
  }
}
