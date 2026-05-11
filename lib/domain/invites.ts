interface InviteExpiry {
  expiresAt: Date;
}

interface InviteUsage {
  usedAt: Date | null;
}

export function isExpiredInvite(invite: InviteExpiry): boolean {
  return invite.expiresAt < new Date();
}

export function isUsedInvite(invite: InviteUsage): boolean {
  return invite.usedAt !== null;
}

export function canAcceptInvite(invite: InviteExpiry & InviteUsage): boolean {
  return !isExpiredInvite(invite) && !isUsedInvite(invite);
}

export const INVITE_EXPIRY_DAYS = 7;
export const MAGIC_LINK_EXPIRY_MINUTES = 5;
