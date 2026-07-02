import { AppController } from '@app/app.controller';
import { AppService } from '@app/app.service';
import { envConfig } from '@config/env.config';
import { envValidationSchema } from '@config/validation.schema';
import { DatabaseModule } from '@infrastructure/database/drizzle/drizzle.module';
import { MessagingModule } from '@infrastructure/messaging/messaging.module';
import { QueueModule } from '@infrastructure/queue/bullmq.module';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { StorageModule } from '@infrastructure/storage/storage.module';
import { AnalyticsModule } from '@modules/analytics/analytics.module';
import { ApplicationsModule } from '@modules/applications/applications.module';
import { AuthModule } from '@modules/auth/auth.module';
import { ChatModule } from '@modules/chat/chat.module';
import { ContractsModule } from '@modules/contracts/contracts.module';
import { DocumentsModule } from '@modules/documents/documents.module';
import { ListingsModule } from '@modules/listings/listings.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { PaymentsModule } from '@modules/payments/payments.module';
import { PropertiesModule } from '@modules/properties/properties.module';
import { SearchModule } from '@modules/search/search.module';
import { UsersModule } from '@modules/users/users.module';
import { VisitsModule } from '@modules/visits/visits.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from '@observability/logging/logger.module';
import { MetricsModule } from '@observability/metrics/metrics.module';
import { TracingModule } from '@observability/tracing/otel.module';
import { RealtimeModule } from '@realtime/socket-io/socket.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [envConfig],
      validate: envValidationSchema,
    }),
    EventEmitterModule.forRoot(),
    BullModule.forRootAsync({
      inject: [envConfig.KEY],
      useFactory: (env: ReturnType<typeof envConfig>) => ({
        connection: {
          host: env.redis.host,
          port: env.redis.port,
          password: env.redis.password,
        },
        prefix: 'keuwo',
      }),
    }),
    LoggerModule,
    TracingModule,
    MetricsModule,
    DatabaseModule,
    RedisModule,
    MessagingModule,
    StorageModule,
    QueueModule,
    RealtimeModule,
    AuthModule,
    UsersModule,
    PropertiesModule,
    ListingsModule,
    SearchModule,
    VisitsModule,
    ApplicationsModule,
    DocumentsModule,
    PaymentsModule,
    ContractsModule,
    NotificationsModule,
    ChatModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
