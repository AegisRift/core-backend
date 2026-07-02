export interface SendSmsInput {
  to: string;
  message: string;
}

export interface SmsProviderPort {
  send(input: SendSmsInput): Promise<{ messageId?: string }>;
}

export const SMS_PROVIDER_PORT = Symbol('SMS_PROVIDER_PORT');
