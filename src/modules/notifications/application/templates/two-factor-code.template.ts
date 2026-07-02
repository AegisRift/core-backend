import { NotificationTemplateDefinition } from './template.types';

export const twoFactorCodeTemplate: NotificationTemplateDefinition = {
  subject: 'Your Keuwo security code',
  requiredVariables: ['firstName', 'code', 'minutesToExpire'],
  html: `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Security code</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
            <tr>
              <td>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827;">Security verification</h1>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">
                  Hi {{firstName}}, use this code to continue your sensitive action in Keuwo:
                </p>
                <p style="margin:0 0 20px;font-size:32px;letter-spacing:6px;font-weight:700;color:#111827;text-align:center;">
                  {{code}}
                </p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
                  This code expires in {{minutesToExpire}} minutes. If you did not request it, please secure your account.
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
