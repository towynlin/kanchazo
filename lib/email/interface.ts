export interface EmailProvider {
  sendInvite(email: string, inviterName: string, url: string): Promise<void>;
}
