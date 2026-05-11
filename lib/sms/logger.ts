import pino from "pino";
import type { SmsProvider } from "./interface";

const log = pino({ name: "sms:logger" });

export class LoggerSmsProvider implements SmsProvider {
  // In-memory outbox for tests
  outbox: Array<{ to: string; type: string; url: string }> = [];

  async sendMagicLink(phone: string, url: string): Promise<void> {
    this.outbox.push({ to: phone, type: "magic-link", url });
    log.info({ phone, url }, "📱 [DEV] Magic link SMS (not sent)");
    console.log(`\n🔗 Magic link for ${phone}: ${url}\n`);
  }

  async sendInvite(phone: string, inviterName: string, url: string): Promise<void> {
    this.outbox.push({ to: phone, type: "invite", url });
    log.info({ phone, inviterName, url }, "📱 [DEV] Invite SMS (not sent)");
    console.log(`\n🔗 Invite from ${inviterName} for ${phone}: ${url}\n`);
  }
}
