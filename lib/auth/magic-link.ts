import { generateToken, hashToken } from "./tokens";
import { checkSmsRateLimit } from "./rate-limit";
import { createMagicToken, findUnusedMagicToken, consumeMagicToken } from "@/lib/db/queries/magic-tokens";
import { findUserByPhone } from "@/lib/db/queries/users";
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

  const { token, hash } = generateToken();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);

  await createMagicToken({ phone, tokenHash: hash, expiresAt });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${appUrl}/auth/verify?t=${token}`;
  await smsProvider.sendMagicLink(phone, url);

  return { ok: true };
}

export type VerifyMagicLinkResult =
  | { ok: true; session: Session; isNewUser: boolean; phone: string }
  | { ok: false; error: string };

export async function verifyMagicLink(rawToken: string): Promise<VerifyMagicLinkResult> {
  const hash = hashToken(rawToken);
  const magicToken = await findUnusedMagicToken(hash);

  if (!magicToken) {
    return { ok: false, error: "Invalid or expired link." };
  }

  await consumeMagicToken(magicToken.id);

  const user = await findUserByPhone(magicToken.phone);
  const isNewUser = !user;

  if (!user) {
    // Return the phone so the UI can prompt for name/email before creating the account
    return { ok: true, session: null as unknown as Session, isNewUser: true, phone: magicToken.phone };
  }

  const session = await createSessionForUser(user.id);
  return { ok: true, session, isNewUser: false, phone: magicToken.phone };
}

export async function createSessionForUser(userId: string): Promise<Session> {
  const { token, hash } = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  return createSession({ userId, tokenHash: hash, expiresAt });
}
