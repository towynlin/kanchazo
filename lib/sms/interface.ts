export interface SmsProvider {
  sendMagicLink(phone: string, url: string): Promise<void>;
  sendInvite(phone: string, inviterName: string, url: string): Promise<void>;
}
