import { NotificationTemplateDefinition } from './template.types';

export const emailConfirmationTemplate: NotificationTemplateDefinition = {
  subject: 'Confirm your Keuwo account email',
  requiredVariables: ['firstName', 'confirmationUrl'],
  html: `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Confirm your email</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
            <tr>
              <td>
                <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#111827;">Welcome to Keuwo, {{firstName}}</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
                  Confirm your email address to secure your account and unlock all platform features.
                </p>
                <p style="margin:24px 0;">
                  <a href="{{confirmationUrl}}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
                    Confirm Email
                  </a>
                </p>
                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#6b7280;">
                  If the button does not work, copy and paste this link:
                </p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#2563eb;word-break:break-all;">
                  {{confirmationUrl}}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`,
};
