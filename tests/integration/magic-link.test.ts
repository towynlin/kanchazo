import { describe, it, expect } from "vitest";
import { createUser } from "@/lib/db/queries/users";
import {
  createMagicToken,
  findUnusedMagicToken,
  consumeMagicToken,
  countRecentMagicTokens,
} from "@/lib/db/queries/magic-tokens";
import { hashToken, generateToken } from "@/lib/auth/tokens";
import { MAGIC_LINK_EXPIRY_MINUTES } from "@/lib/domain/invites";

function rando() {
  return `+1415555${Math.floor(Math.random() * 9000 + 1000)}`;
}

describe("magic-token queries", () => {
  it("creates and finds an unused magic token", async () => {
    const phone = rando();
    const { token, hash } = generateToken();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);

    const created = await createMagicToken({ phone, tokenHash: hash, expiresAt });
    expect(created.id).toBeTruthy();
    expect(created.phone).toBe(phone);

    const found = await findUnusedMagicToken(hash);
    expect(found?.id).toBe(created.id);
    expect(found?.usedAt).toBeNull();
  });

  it("returns null for expired token", async () => {
    const phone = rando();
    const { hash } = generateToken();
    const expiresAt = new Date(Date.now() - 1000); // already expired

    await createMagicToken({ phone, tokenHash: hash, expiresAt });
    const found = await findUnusedMagicToken(hash);
    expect(found).toBeNull();
  });

  it("returns null after token is consumed", async () => {
    const phone = rando();
    const { hash } = generateToken();
    const expiresAt = new Date(Date.now() + 300000);

    const token = await createMagicToken({ phone, tokenHash: hash, expiresAt });
    await consumeMagicToken(token.id);

    const found = await findUnusedMagicToken(hash);
    expect(found).toBeNull();
  });

  it("counts recent magic tokens for rate limiting", async () => {
    const phone = rando();
    const expiresAt = new Date(Date.now() + 300000);

    for (let i = 0; i < 3; i++) {
      const { hash } = generateToken();
      await createMagicToken({ phone, tokenHash: hash, expiresAt });
    }

    const since = new Date(Date.now() - 3600000); // 1 hour ago
    const count = await countRecentMagicTokens(phone, since);
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it("returns 0 count for phone with no recent tokens", async () => {
    const phone = rando();
    const since = new Date(Date.now() - 3600000);
    const count = await countRecentMagicTokens(phone, since);
    expect(count).toBe(0);
  });
});
