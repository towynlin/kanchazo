import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/require-auth";
import { ok, err, handleZodError } from "@/lib/api/response";
import { updateUser, deleteUser } from "@/lib/db/queries/users";
import { makeClearSessionCookieHeader } from "@/lib/auth/session";
import { normalizePhone } from "@/lib/domain/phone";

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  return ok({
    id: auth.user.id,
    name: auth.user.name,
    email: auth.user.email,
    phone: auth.user.phone,
  });
}

const deleteSchema = z.object({ confirm: z.literal("delete my account") });

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) return err('Type "delete my account" to confirm', 400);

    await deleteUser(auth.user.id);
    const response = ok({ deleted: true });
    response.headers.set("Set-Cookie", makeClearSessionCookieHeader());
    return response;
  } catch (e) {
    return handleZodError(e);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    let phone: string | null | undefined = undefined;
    if (data.phone !== undefined) {
      phone = data.phone ? normalizePhone(data.phone) : null;
      if (data.phone && !phone) return err("Invalid phone number", 400);
    }

    const updated = await updateUser(auth.user.id, { ...data, phone });
    return ok(updated);
  } catch (e) {
    return handleZodError(e);
  }
}
