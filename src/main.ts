import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { CorrelationIdMiddleware } from './observability/middleware/correlation-id.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(Logger));
  app.use((req, res, next) => CorrelationIdMiddleware.handle(req, res, next));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
