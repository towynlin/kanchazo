import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/require-auth";
import { ok, handleZodError } from "@/lib/api/response";
import { updateUser } from "@/lib/db/queries/users";

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().nullable().optional(),
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

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const data = schema.parse(body);
    const updated = await updateUser(auth.user.id, data);
    return ok(updated);
  } catch (e) {
    return handleZodError(e);
  }
}
