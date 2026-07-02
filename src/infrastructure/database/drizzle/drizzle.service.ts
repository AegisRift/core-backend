import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { envConfig } from '../../../config/env.config';

/**
 * Minimal query surface shared by the root database instance and transaction
 * handles, so repositories can run inside an ambient transaction.
 */
export type DrizzleExecutor = Pick<NodePgDatabase, 'select' | 'insert' | 'update' | 'delete'>;

@Injectable()
export class DrizzleService {
  readonly db: NodePgDatabase;
  private readonly pool: Pool;

  constructor(
    @Inject(envConfig.KEY)
    private readonly env: ConfigType<typeof envConfig>,
  ) {
    this.pool = new Pool({ connectionString: this.env.postgres.url });
    this.db = drizzle(this.pool);
  }
}
