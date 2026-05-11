import pino from "pino";
import type { EmailProvider } from "./interface";

const log = pino({ name: "email:logger" });

export class LoggerEmailProvider implements EmailProvider {
  outbox: Array<{ to: string; type: string; url: string }> = [];

  async sendMagicLink(email: string, url: string): Promise<void> {
    this.outbox.push({ to: email, type: "magic-link", url });
    log.info({ email, url }, "📧 [DEV] Magic link email (not sent)");
    console.log(`\n🔗 Magic link for ${email}: ${url}\n`);
  }

  async sendInvite(email: string, inviterName: string, url: string): Promise<void> {
    this.outbox.push({ to: email, type: "invite", url });
    log.info({ email, inviterName, url }, "📧 [DEV] Invite email (not sent)");
    console.log(`\n🔗 Invite from ${inviterName} for ${email}: ${url}\n`);
  }
}
