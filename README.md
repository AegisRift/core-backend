# Keuwo Core Backend

Backend service for the Keuwo platform, built with NestJS and TypeScript.

## Stack

- Node.js + NestJS
- PostgreSQL + Drizzle ORM
- Redis + BullMQ
- Socket.IO (realtime)
- S3-compatible object storage (MinIO in local)

## Project Structure

- `src/modules`: business modules (`auth`, `users`, `properties`, `listings`, etc.)
- `src/infrastructure`: adapters for database, messaging, redis, and storage
- `src/realtime`: websocket gateways and adapters
- `src/observability`: logging, metrics, and tracing setup
- `drizzle`: migrations and seeds
- `test`: unit, integration, e2e, and contract tests

## Prerequisites

- Node.js 20+
- npm 10+
- Docker + Docker Compose (recommended for local infra)

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Start local infrastructure (PostgreSQL, Redis, MinIO):

```bash
docker compose up -d postgres redis minio
```

4. Run database migrations:

```bash
npm run drizzle:migrate
```

5. Start the API in development mode:

```bash
npm run start:dev
```

API will be available at `http://localhost:3000`.

## Available Scripts

- `npm run build`: build TypeScript to `dist`
- `npm run start`: run compiled app
- `npm run start:dev`: run app with ts-node
- `npm run start:debug`: run app in debug mode
- `npm run lint`: lint sources
- `npm run lint:fix`: lint and auto-fix
- `npm run test`: run unit tests
- `npm run test:e2e`: run e2e suite
- `npm run test:cov`: run tests with coverage
- `npm run drizzle:generate`: generate new migrations
- `npm run drizzle:migrate`: apply migrations
- `npm run drizzle:push`: push schema changes directly

## Environment Variables

All local defaults are documented in `.env.example`.

Important variables:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_HOST`, `REDIS_PORT`: Redis connection settings
- `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`: JWT secrets
- `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`: object storage credentials

## Local Services (Docker Compose)

`docker-compose.yml` defines:

- `postgres` on `5432`
- `redis` on `6379`
- `minio` API on `9000` and console on `9001`
- `api` container for development usage

## Testing

```bash
# unit + integration (default jest config)
npm run test

# end-to-end
npm run test:e2e
```

## Notes

- This repository uses `.gitignore` to exclude `node_modules`, build output, coverage, and environment files.
- Keep secrets in `.env` only; never commit real credentials.
