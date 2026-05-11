export interface EmailProvider {
  sendMagicLink(email: string, url: string): Promise<void>;
  sendInvite(email: string, inviterName: string, url: string): Promise<void>;
}
