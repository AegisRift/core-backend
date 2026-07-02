export type NotificationTemplateId = 'email-confirmation' | 'two-factor-code';

export interface NotificationTemplateDefinition {
  subject: string;
  html: string;
  requiredVariables: string[];
}
