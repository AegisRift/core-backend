import type { Config } from 'drizzle-kit';

export default {
  schema: './src/infrastructure/database/drizzle/schema/*.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgres://postgres:postgres@localhost:5432/keuwo',
  },
} satisfies Config;
