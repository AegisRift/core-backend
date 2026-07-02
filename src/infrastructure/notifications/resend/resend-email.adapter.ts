import { envConfig } from '@config/env.config';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { SendEmailInput } from '@shared/application/ports/email-provider.port';
import { Resend } from 'resend';

@Injectable()
export class ResendEmailAdapter {
  private readonly logger = new Logger(ResendEmailAdapter.name);

  constructor(
    @Inject(envConfig.KEY)
    private readonly env: ConfigType<typeof envConfig>,
  ) {}

  async send(input: SendEmailInput): Promise<{ messageId?: string }> {
    if (!this.env.notifications.resendApiKey) {
      this.logger.warn('RESEND_API_KEY not configured, email send skipped.');
      return { messageId: 'skipped-missing-resend-api-key' };
    }

    const resend = new Resend(this.env.notifications.resendApiKey);
    const response = await resend.emails.send({
      from: this.env.notifications.resendFromEmail,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    return { messageId: response.data?.id };
  }
}
