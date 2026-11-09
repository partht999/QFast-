import { promises as dns } from 'dns';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {}

  async sendRegistrationOtp(email: string, code: string) {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS')?.replace(/\s+/g, '');
    const missing = [!host && 'SMTP_HOST', !user && 'SMTP_USER', !pass && 'SMTP_PASS'].filter(Boolean);
    if (!host || !user || !pass) {
      this.logger.error(`SMTP config missing: ${missing.join(', ')}`);
      throw new ServiceUnavailableException(
        'Email delivery is not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS, and MAIL_FROM.',
      );
    }

    const port = Number(this.config.get<string>('SMTP_PORT') || 587);
    const configuredFrom = this.config.get<string>('MAIL_FROM')?.trim();
    const from =
      !configuredFrom || configuredFrom.includes('yourdomain.com') ? `Qfast <${user}>` : configuredFrom;
    const targets = await this.ipv4Targets(host);
    const message = {
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
    };

    let lastError: unknown;
    for (const target of targets) {
      this.logger.log(
        `OTP send start host=${host} ip=${target} port=${port} secure=${port === 465} user=${user} passLength=${pass.length} from=${from} to=${email}`,
      );
      const transporter = nodemailer.createTransport({
        host: target,
        port,
        secure: port === 465,
        auth: { user, pass },
        connectionTimeout: 12_000,
        greetingTimeout: 12_000,
        socketTimeout: 20_000,
        tls: { servername: host },
      });

      try {
        const info = await transporter.sendMail(message);
        this.logger.log(`OTP send accepted messageId=${info.messageId} response=${info.response}`);
        return;
      } catch (error) {
        lastError = error;
        const err = this.smtpError(error);
        this.logger.error(
          `OTP send failed host=${host} ip=${target} port=${port} code=${err.code ?? 'unknown'} command=${err.command ?? ''} responseCode=${err.responseCode ?? ''} response=${err.response ?? ''} message=${err.message}`,
        );
        if (!this.isUnreachable(err.code)) break;
      }
    }

    throw this.toMailException(host, port, lastError);
  }

  /** Gmail's IPv6 address does not answer on this network, so connect to an A record. */
  private async ipv4Targets(host: string) {
    try {
      const addresses = await dns.resolve4(host);
      if (addresses.length) return addresses;
    } catch (error) {
      this.logger.warn(`IPv4 lookup failed for ${host}: ${(error as Error).message}`);
    }
    return [host];
  }

  private smtpError(error: unknown) {
    return error as NodeJS.ErrnoException & {
      response?: string;
      responseCode?: number;
      command?: string;
    };
  }

  private isUnreachable(code?: string) {
    return code === 'ETIMEDOUT' || code === 'ESOCKET' || code === 'ECONNECTION' || code === 'ECONNRESET';
  }

  private toMailException(host: string, port: number, error: unknown) {
    const err = this.smtpError(error);
    if (err.code === 'EAUTH' || err.responseCode === 535) {
      return new ServiceUnavailableException(
        'The mail server rejected SMTP_USER or SMTP_PASS. For Gmail, SMTP_PASS must be a 16-character App Password, not the Google account password.',
      );
    }
    if (this.isUnreachable(err.code)) {
      return new ServiceUnavailableException(
        `Could not reach ${host}:${port} (${err.code}). Use SMTP_HOST=smtp.gmail.com and SMTP_PORT=587, save apps/api/.env, and restart the API.`,
      );
    }
    return new ServiceUnavailableException(
      `Verification email failed (${err.code || err.responseCode || 'smtp'}). The API log has the SMTP detail.`,
    );
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
