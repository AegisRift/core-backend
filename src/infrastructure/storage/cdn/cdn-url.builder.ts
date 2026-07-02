import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { envConfig } from '../../../config/env.config';

@Injectable()
export class CdnUrlBuilder {
  constructor(
    @Inject(envConfig.KEY)
    private readonly env: ConfigType<typeof envConfig>,
  ) {}

  forObject(path: string): string {
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    return `${this.env.storage.cdnBaseUrl}/${normalizedPath}`;
  }
}
