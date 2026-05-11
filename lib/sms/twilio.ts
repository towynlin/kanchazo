import type { SmsProvider } from "./interface";

export class TwilioSmsProvider implements SmsProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID!;
    this.authToken = process.env.TWILIO_AUTH_TOKEN!;
    this.fromNumber = process.env.TWILIO_FROM_NUMBER!;
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      throw new Error("Missing Twilio environment variables");
    }
  }

  private async send(to: string, body: string): Promise<void> {
    const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: this.fromNumber, Body: body }).toString(),
      },
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Twilio error ${response.status}: ${text}`);
    }
  }

  async sendMagicLink(phone: string, url: string): Promise<void> {
    await this.send(phone, `Your Kanchazo sign-in link: ${url}\n\nExpires in 5 minutes.`);
  }

  async sendInvite(phone: string, inviterName: string, url: string): Promise<void> {
    await this.send(phone, `${inviterName} invited you to join their team on Kanchazo: ${url}`);
  }
}
