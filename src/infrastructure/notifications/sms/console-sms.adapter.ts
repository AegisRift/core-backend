import { Injectable, Logger } from '@nestjs/common';
import { SendSmsInput } from '@shared/application/ports/sms-provider.port';

@Injectable()
export class ConsoleSmsAdapter {
  private readonly logger = new Logger(ConsoleSmsAdapter.name);

  async send(input: SendSmsInput): Promise<{ messageId?: string }> {
    this.logger.log(`[SMS] to=${input.to} message="${input.message}"`);
    return { messageId: `console-${Date.now()}` };
  }
}
