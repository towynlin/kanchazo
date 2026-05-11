import type { EmailProvider } from "./interface";

export class ResendEmailProvider implements EmailProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY!;
    if (!this.apiKey) throw new Error("Missing RESEND_API_KEY");
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Kanchazo <noreply@kanchazo.app>",
        to,
        subject,
        html,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Resend error ${response.status}: ${text}`);
    }
  }

  async sendMagicLink(email: string, url: string): Promise<void> {
    await this.send(
      email,
      "Your Kanchazo sign-in link",
      `<p>Click to sign in to Kanchazo (expires in 5 minutes):</p>
       <p><a href="${url}">${url}</a></p>`,
    );
  }

  async sendInvite(email: string, inviterName: string, url: string): Promise<void> {
    await this.send(
      email,
      `${inviterName} invited you to Kanchazo`,
      `<p>${inviterName} has invited you to join their team on Kanchazo.</p>
       <p><a href="${url}">Accept invitation</a></p>`,
    );
  }
}
