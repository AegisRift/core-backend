import { Global, Module } from '@nestjs/common';

import { CdnUrlBuilder } from './cdn/cdn-url.builder';
import { S3StorageAdapter } from './s3/s3-storage.adapter';

@Global()
@Module({
  providers: [S3StorageAdapter, CdnUrlBuilder],
  exports: [S3StorageAdapter, CdnUrlBuilder],
})
export class StorageModule {}
