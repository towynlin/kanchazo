import { generateToken, hashToken } from "./tokens";
import { createSessionForUser } from "./session";
import {
  generateRecoveryCode,
  normalizeRecoveryCode,
  isWellFormedRecoveryCode,
  RECOVERY_CODE_COUNT,
} from "@/lib/domain/recovery-codes";
import {
  replaceRecoveryCodes,
  findUnusedRecoveryCode,
  consumeRecoveryCode,
} from "@/lib/db/queries/recovery-codes";
import {
  createRecoveryLink,
  findValidRecoveryLink,
  consumeRecoveryLink,
} from "@/lib/db/queries/recovery-links";
import { findUserById } from "@/lib/db/queries/users";
import type { Session, User } from "@/lib/db/schema";

export const RECOVERY_LINK_EXPIRY_HOURS = 24;

/** Replace all of a user's recovery codes with a fresh set; returns the raw codes (shown once). */
export async function issueRecoveryCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => generateRecoveryCode());
  await replaceRecoveryCodes(
    userId,
    codes.map((c) => hashToken(normalizeRecoveryCode(c))),
  );
  return codes;
}

export type RedeemResult =
  | { ok: true; rawSessionToken: string; session: Session; user: User }
  | { ok: false; error: string };

/** Redeem a single-use recovery code and sign the owner in. */
export async function redeemRecoveryCode(input: string): Promise<RedeemResult> {
  const invalid = { ok: false as const, error: "Invalid or already-used recovery code." };
  if (!isWellFormedRecoveryCode(input)) return invalid;

  const record = await findUnusedRecoveryCode(hashToken(normalizeRecoveryCode(input)));
  if (!record) return invalid;

  const user = await findUserById(record.userId);
  if (!user) return invalid;

  await consumeRecoveryCode(record.id);
  const { rawSessionToken, session } = await createSessionForUser(user.id);
  return { ok: true, rawSessionToken, session, user };
}

/** Create a single-use sign-in link for a user who lost their passkey. */
export async function issueRecoveryLink(
  userId: string,
  createdByUserId: string | null,
): Promise<{ url: string; expiresAt: Date }> {
  const { token, hash } = generateToken();
  const expiresAt = new Date(Date.now() + RECOVERY_LINK_EXPIRY_HOURS * 60 * 60 * 1000);
  await createRecoveryLink({ userId, createdByUserId, tokenHash: hash, expiresAt });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { url: `${appUrl}/recover/${token}`, expiresAt };
}

/** Look up a recovery link without consuming it (for the landing page). */
export async function peekRecoveryLink(rawToken: string): Promise<{ userName: string } | null> {
  const link = await findValidRecoveryLink(hashToken(rawToken));
  if (!link) return null;
  const user = await findUserById(link.userId);
  if (!user) return null;
  return { userName: user.name };
}

/** Redeem a recovery link and sign its owner in. */
export async function redeemRecoveryLink(rawToken: string): Promise<RedeemResult> {
  const invalid = { ok: false as const, error: "This recovery link is invalid or has expired." };

  const link = await findValidRecoveryLink(hashToken(rawToken));
  if (!link) return invalid;

  const user = await findUserById(link.userId);
  if (!user) return invalid;

  await consumeRecoveryLink(link.id);
  const { rawSessionToken, session } = await createSessionForUser(user.id);
  return { ok: true, rawSessionToken, session, user };
}
