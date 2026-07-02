import { Module } from '@nestjs/common';

import { PropertiesController } from '@modules/properties/api/http/properties.controller';
import { PropertiesService } from '@modules/properties/application/properties.service';
import { PropertiesRepository } from '@modules/properties/infrastructure/persistence/properties.repository';

@Module({
  controllers: [PropertiesController],
  providers: [PropertiesService, PropertiesRepository],
})
export class PropertiesModule {}
