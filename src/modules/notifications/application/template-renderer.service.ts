import { BadRequestException, Injectable } from '@nestjs/common';

import { emailConfirmationTemplate } from './templates/email-confirmation.template';
import { twoFactorCodeTemplate } from './templates/two-factor-code.template';
import { NotificationTemplateDefinition, NotificationTemplateId } from './templates/template.types';

@Injectable()
export class TemplateRendererService {
  private readonly templates: Record<NotificationTemplateId, NotificationTemplateDefinition> = {
    'email-confirmation': emailConfirmationTemplate,
    'two-factor-code': twoFactorCodeTemplate,
  };

  render(templateId: NotificationTemplateId, variables: Record<string, string | number>) {
    const template = this.templates[templateId];
    if (!template) {
      throw new BadRequestException(`Unknown template: ${templateId}`);
    }

    for (const variable of template.requiredVariables) {
      if (!(variable in variables)) {
        throw new BadRequestException(`Missing template variable: ${variable}`);
      }
    }

    const html = template.html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      const value = variables[key];
      if (value === undefined || value === null) {
        return '';
      }
      return this.escapeHtml(String(value));
    });

    return {
      subject: template.subject,
      html,
    };
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
