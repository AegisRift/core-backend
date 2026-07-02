export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface EmailProviderPort {
  send(input: SendEmailInput): Promise<{ messageId?: string }>;
}

export const EMAIL_PROVIDER_PORT = Symbol('EMAIL_PROVIDER_PORT');
