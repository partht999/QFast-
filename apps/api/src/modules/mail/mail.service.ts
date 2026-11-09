import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  constructor(private config: ConfigService) {}

  async sendRegistrationOtp(email: string, code: string) {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (!host || !user || !pass) {
      throw new ServiceUnavailableException(
        'Email delivery is not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS, and MAIL_FROM.',
      );
    }

    const port = Number(this.config.get<string>('SMTP_PORT') || 587);
    const from = this.config.get<string>('MAIL_FROM') || `Qfast <${user}>`;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: email,
      subject: `${code} is your Qfast verification code`,
      text: [
        'Verify your business email',
        '',
        `Use this code to finish creating your Qfast workspace: ${code}`,
        '',
        'The code expires in 10 minutes.',
        'If you did not ask for this email, you can ignore it.',
      ].join('\n'),
      html: this.registrationHtml(email, code),
    });
  }

  private registrationHtml(email: string, code: string) {
    const safeEmail = email.replace(/[&<>"]/g, (character) => {
      const escaped: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
      return escaped[character];
    });

    return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f8fafc;color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;">
            <tr>
              <td style="padding:32px;">
                <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.14em;color:#ea580c;">QFAST</p>
                <h1 style="margin:16px 0 8px;font-size:26px;line-height:1.2;">Verify your business email</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">
                  Enter this code to confirm <strong style="color:#0f172a;">${safeEmail}</strong> and finish creating your workspace.
                </p>
                <p style="margin:0;padding:18px 12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;text-align:center;font-size:34px;font-weight:800;letter-spacing:10px;color:#9a3412;">
                  ${code}
                </p>
                <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#64748b;">
                  This code expires in 10 minutes. If you did not try to create a Qfast account, you can ignore this email.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">Qfast · Live queues for service businesses</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }
}
