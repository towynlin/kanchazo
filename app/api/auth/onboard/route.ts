import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, handleZodError } from "@/lib/api/response";
import { createUser, findUserByPhone } from "@/lib/db/queries/users";
import { createSessionForUser } from "@/lib/auth/magic-link";
import { makeSessionCookieHeader } from "@/lib/auth/session";
import { normalizePhone } from "@/lib/domain/phone";

const schema = z.object({
  phone: z.string().min(1),
  name: z.string().min(1).max(200),
  email: z.string().email().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone: rawPhone, name, email } = schema.parse(body);

    const phone = normalizePhone(rawPhone);
    if (!phone) return err("Invalid phone number", 400);

    const existing = await findUserByPhone(phone);
    if (existing) return err("User already exists", 409);

    const user = await createUser({ phone, name, email: email ?? null });
    const { rawSessionToken } = await createSessionForUser(user.id);

    const response = ok({ userId: user.id });
    response.headers.set("Set-Cookie", makeSessionCookieHeader(rawSessionToken));
    return response;
  } catch (e) {
    return handleZodError(e);
  }
}
