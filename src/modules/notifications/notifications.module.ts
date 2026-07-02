import { ResendEmailAdapter } from '@infrastructure/notifications/resend/resend-email.adapter';
import { ConsoleSmsAdapter } from '@infrastructure/notifications/sms/console-sms.adapter';
import { QueueModule } from '@infrastructure/queue/bullmq.module';
import { NotificationsWorker } from '@jobs/workers/notifications.worker';
import { Module } from '@nestjs/common';
import { EMAIL_PROVIDER_PORT } from '@shared/application/ports/email-provider.port';
import { SMS_PROVIDER_PORT } from '@shared/application/ports/sms-provider.port';

import { NotificationsService } from './application/notifications.service';
import { TemplateRendererService } from './application/template-renderer.service';

@Module({
  imports: [QueueModule],
  providers: [
    NotificationsWorker,
    TemplateRendererService,
    NotificationsService,
    ResendEmailAdapter,
    ConsoleSmsAdapter,
    {
      provide: EMAIL_PROVIDER_PORT,
      useExisting: ResendEmailAdapter,
    },
    {
      provide: SMS_PROVIDER_PORT,
      useExisting: ConsoleSmsAdapter,
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
