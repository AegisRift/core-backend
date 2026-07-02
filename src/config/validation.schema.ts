import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  ACCESS_TOKEN_SECRET: z.string().min(8).default('change-me'),
  REFRESH_TOKEN_SECRET: z.string().min(8).default('change-me-too'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().positive().default(900),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().positive().default(2592000),
  SEED_USER_EMAIL: z.string().email().optional(),
  SEED_USER_PASSWORD: z.string().min(8).optional(),
});

export function envValidationSchema(config: Record<string, unknown>) {
  return envSchema.parse(config);
}
