import { NotificationsService } from '@modules/notifications/application/notifications.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('notifications')
export class NotificationsWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationsWorker.name);

  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(
    job: Job<
      | {
          type: 'email-confirmation';
          to: string;
          firstName: string;
          confirmationUrl: string;
        }
      | {
          type: 'two-factor-code-email';
          to: string;
          firstName: string;
          code: string;
          minutesToExpire: number;
        }
      | {
          type: 'two-factor-code-phone';
          to: string;
          code: string;
        }
    >,
  ): Promise<void> {
    if (job.data.type === 'email-confirmation') {
      await this.notificationsService.sendEmailConfirmation(job.data);
      return;
    }
    if (job.data.type === 'two-factor-code-email') {
      await this.notificationsService.sendTwoFactorCodeByEmail(job.data);
      return;
    }
    if (job.data.type === 'two-factor-code-phone') {
      await this.notificationsService.sendTwoFactorCodeByPhone(job.data);
      return;
    }
    this.logger.warn(`Unknown notifications job type: ${(job.data as { type?: string }).type}`);
  }
}
