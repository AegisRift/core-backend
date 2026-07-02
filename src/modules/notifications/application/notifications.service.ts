import {
  EMAIL_PROVIDER_PORT,
  EmailProviderPort,
} from '@shared/application/ports/email-provider.port';
import { SMS_PROVIDER_PORT, SmsProviderPort } from '@shared/application/ports/sms-provider.port';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { TemplateRendererService } from './template-renderer.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly templateRenderer: TemplateRendererService,
    @Inject(EMAIL_PROVIDER_PORT) private readonly emailProvider: EmailProviderPort,
    @Inject(SMS_PROVIDER_PORT) private readonly smsProvider: SmsProviderPort,
  ) {}

  async sendEmailConfirmation(input: {
    to: string;
    firstName: string;
    confirmationUrl: string;
  }): Promise<void> {
    const rendered = this.templateRenderer.render('email-confirmation', {
      firstName: input.firstName,
      confirmationUrl: input.confirmationUrl,
    });
    await this.emailProvider.send({
      to: input.to,
      subject: rendered.subject,
      html: rendered.html,
    });
  }

  async sendTwoFactorCodeByEmail(input: {
    to: string;
    firstName: string;
    code: string;
    minutesToExpire: number;
  }): Promise<void> {
    const rendered = this.templateRenderer.render('two-factor-code', {
      firstName: input.firstName,
      code: input.code,
      minutesToExpire: input.minutesToExpire,
    });
    await this.emailProvider.send({
      to: input.to,
      subject: rendered.subject,
      html: rendered.html,
    });
  }

  async sendTwoFactorCodeByPhone(input: { to: string; code: string }): Promise<void> {
    await this.smsProvider.send({
      to: input.to,
      message: `Tu codigo de seguridad de Keuwo es: ${input.code}`,
    });
    this.logger.log(`2FA code dispatched to phone ending in ${input.to.slice(-4)}`);
  }
}
