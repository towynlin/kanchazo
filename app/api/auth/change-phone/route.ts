import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/require-auth";
import { ok, err, handleZodError } from "@/lib/api/response";
import { findUserByPhone, updateUser } from "@/lib/db/queries/users";
import {
  createMagicToken,
  findUnusedMagicToken,
  consumeMagicToken,
} from "@/lib/db/queries/magic-tokens";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { normalizePhone } from "@/lib/domain/phone";
import { getSmsProvider } from "@/lib/sms";
import { MAGIC_LINK_EXPIRY_MINUTES } from "@/lib/domain/invites";

const sendSchema = z.object({ phone: z.string().min(1) });
const verifySchema = z.object({ phone: z.string(), token: z.string() });

// POST /api/auth/change-phone  — step 1: send OTP to new number
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const { phone: rawPhone } = sendSchema.parse(await req.json());
    const phone = normalizePhone(rawPhone);
    if (!phone) return err("Invalid phone number", 400);

    if (phone === auth.user.phone) return err("That is already your phone number", 400);

    const existing = await findUserByPhone(phone);
    if (existing) return err("That phone number is already in use", 409);

    const { token, hash } = generateToken();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);
    await createMagicToken({ phone, tokenHash: hash, expiresAt });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const verifyUrl = `${appUrl}/settings/verify-phone?t=${token}&phone=${encodeURIComponent(phone)}`;
    await getSmsProvider().sendMagicLink(phone, verifyUrl);

    return ok({ sent: true });
  } catch (e) {
    return handleZodError(e);
  }
}

// PUT /api/auth/change-phone  — step 2: verify OTP and swap phone
export async function PUT(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const { phone: rawPhone, token } = verifySchema.parse(await req.json());
    const phone = normalizePhone(rawPhone);
    if (!phone) return err("Invalid phone number", 400);

    const tokenHash = hashToken(token);
    const record = await findUnusedMagicToken(tokenHash);
    if (!record || record.phone !== phone) return err("Invalid or expired code", 400);
    if (record.expiresAt < new Date()) return err("Code expired", 400);

    const existing = await findUserByPhone(phone);
    if (existing && existing.id !== auth.user.id) return err("Phone number already in use", 409);

    await consumeMagicToken(record.id);
    await updateUser(auth.user.id, { phone });

    return ok({ updated: true });
  } catch (e) {
    return handleZodError(e);
  }
}
