import { registerAs } from '@nestjs/config';

export const envConfig = registerAs('env', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  postgres: {
    url: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/keuwo',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD ?? undefined,
  },
  auth: {
    issuer: process.env.AUTH_ISSUER ?? 'keuwo-api',
    audience: process.env.AUTH_AUDIENCE ?? 'keuwo-clients',
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET ?? 'change-me',
    accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET ?? 'change-me-too',
    refreshTokenTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 2592000),
    seedUserEmail: process.env.SEED_USER_EMAIL ?? 'admin@keuwo.local',
    seedUserPassword: process.env.SEED_USER_PASSWORD ?? 'Admin1234!',
  },
  storage: {
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? 'minio',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? 'minio123',
    region: process.env.S3_REGION ?? 'us-east-1',
    mediaBucket: process.env.S3_MEDIA_BUCKET ?? 'keuwo-media',
    documentsBucket: process.env.S3_DOCUMENTS_BUCKET ?? 'keuwo-documents',
    cdnBaseUrl: process.env.CDN_BASE_URL ?? 'http://localhost:8080',
  },
  kafka: {
    enabled: process.env.KAFKA_ENABLED === 'true',
    brokers: process.env.KAFKA_BROKERS?.split(',') ?? [],
  },
}));
