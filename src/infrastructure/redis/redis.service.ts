import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import Redis from 'ioredis';

import { envConfig } from '../../config/env.config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(
    @Inject(envConfig.KEY)
    private readonly env: ConfigType<typeof envConfig>,
  ) {
    this.client = new Redis({
      host: env.redis.host,
      port: env.redis.port,
      password: env.redis.password,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
