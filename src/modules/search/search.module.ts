import { Module } from '@nestjs/common';

import { SearchController } from './api/http/search.controller';
import { SearchService } from './application/search.service';
import { SearchRepository } from './infrastructure/persistence/search.repository';

@Module({
  controllers: [SearchController],
  providers: [SearchService, SearchRepository],
  exports: [SearchRepository],
})
export class SearchModule {}
