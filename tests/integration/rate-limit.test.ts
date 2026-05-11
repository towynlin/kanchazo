import { describe, it, expect } from "vitest";
import { sendMagicLink } from "@/lib/auth/magic-link";
import { createUser } from "@/lib/db/queries/users";
import { LoggerSmsProvider } from "@/lib/sms/logger";

function rando() {
  return `+1415555${Math.floor(Math.random() * 9000 + 1000)}`;
}

describe("SMS rate limiting", () => {
  it("allows the first magic link request for a known user", async () => {
    const phone = rando();
    await createUser({ name: "Test User", phone });
    const sms = new LoggerSmsProvider();
    const result = await sendMagicLink(phone, sms);
    expect(result.ok).toBe(true);
  });

  it("blocks a second request within 30 seconds for the same phone", async () => {
    const phone = rando();
    await createUser({ name: "Rate Test User", phone });
    const sms = new LoggerSmsProvider();

    const first = await sendMagicLink(phone, sms);
    expect(first.ok).toBe(true);

    const second = await sendMagicLink(phone, sms);
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.status).toBe(429);
      expect(second.error).toContain("30 seconds");
    }
  });
});
