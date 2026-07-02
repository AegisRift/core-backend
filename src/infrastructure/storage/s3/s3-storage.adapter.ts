import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { envConfig } from '../../../config/env.config';

@Injectable()
export class S3StorageAdapter {
  constructor(
    @Inject(envConfig.KEY)
    private readonly env: ConfigType<typeof envConfig>,
  ) {}

  getPresignedUploadUrl(key: string, bucket: 'media' | 'documents'): string {
    const bucketName =
      bucket === 'media' ? this.env.storage.mediaBucket : this.env.storage.documentsBucket;
    return `${this.env.storage.endpoint}/${bucketName}/${key}`;
  }
}
