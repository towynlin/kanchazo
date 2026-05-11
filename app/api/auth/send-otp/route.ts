import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, handleZodError } from "@/lib/api/response";
import { normalizePhone } from "@/lib/domain/phone";
import { sendMagicLink } from "@/lib/auth/magic-link";
import { getSmsProvider } from "@/lib/sms";

const schema = z.object({ phone: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone: rawPhone } = schema.parse(body);

    const phone = normalizePhone(rawPhone);
    if (!phone) return err("Invalid phone number", 400);

    const sms = getSmsProvider();
    const result = await sendMagicLink(phone, sms);

    if (!result.ok) {
      return err(result.error, result.status);
    }
    return ok({ sent: true });
  } catch (e) {
    return handleZodError(e);
  }
}
