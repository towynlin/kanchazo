import { generateToken, hashToken } from "./tokens";
import { checkSmsRateLimit } from "./rate-limit";
import {
  createMagicToken,
  findUnusedMagicToken,
  consumeMagicToken,
} from "@/lib/db/queries/magic-tokens";
import { findUserByPhone } from "@/lib/db/queries/users";
import { findValidInvitationByPhone } from "@/lib/db/queries/invitations";
import { createSession } from "@/lib/db/queries/sessions";
import type { SmsProvider } from "@/lib/sms/interface";
import type { Session } from "@/lib/db/schema";
import { MAGIC_LINK_EXPIRY_MINUTES } from "@/lib/domain/invites";

export type SendMagicLinkResult =
  | { ok: true }
  | { ok: false; error: string; status: 429 | 403 | 400 };

export async function sendMagicLink(
  phone: string,
  smsProvider: SmsProvider,
): Promise<SendMagicLinkResult> {
  const rateCheck = await checkSmsRateLimit(phone);
  if (!rateCheck.allowed) {
    return { ok: false, error: rateCheck.reason, status: 429 };
  }

  // Enforce invite-only: unregistered phones must have a valid pending invitation
  const existingUser = await findUserByPhone(phone);
  if (!existingUser) {
    const invite = await findValidInvitationByPhone(phone);
    if (!invite) {
      return { ok: false, error: "No account found for that number.", status: 403 };
    }
  }

  const { token, hash } = generateToken();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);

  await createMagicToken({ phone, tokenHash: hash, expiresAt });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${appUrl}/auth/verify?t=${token}`;
  await smsProvider.sendMagicLink(phone, url);

  return { ok: true };
}

export type VerifyMagicLinkResult =
  | { ok: true; rawSessionToken: string; session: Session; isNewUser: false; phone: string }
  | { ok: true; rawSessionToken: null; session: null; isNewUser: true; phone: string }
  | { ok: false; error: string };

export async function verifyMagicLink(rawToken: string): Promise<VerifyMagicLinkResult> {
  const hash = hashToken(rawToken);
  const magicToken = await findUnusedMagicToken(hash);

  if (!magicToken) {
    return { ok: false, error: "Invalid or expired link." };
  }

  await consumeMagicToken(magicToken.id);

  const user = await findUserByPhone(magicToken.phone);

  if (!user) {
    return {
      ok: true,
      rawSessionToken: null,
      session: null,
      isNewUser: true,
      phone: magicToken.phone,
    };
  }

  const { rawSessionToken, session } = await createSessionForUser(user.id);
  return { ok: true, rawSessionToken, session, isNewUser: false, phone: magicToken.phone };
}

export async function createSessionForUser(
  userId: string,
): Promise<{ rawSessionToken: string; session: Session }> {
  const { token, hash } = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const session = await createSession({ userId, tokenHash: hash, expiresAt });
  return { rawSessionToken: token, session };
}
