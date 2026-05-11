import { describe, it, expect } from "vitest";
import { createUser, findUserByPhone, updateUser } from "@/lib/db/queries/users";
import {
  createMagicToken,
  findUnusedMagicToken,
  consumeMagicToken,
} from "@/lib/db/queries/magic-tokens";
import { generateToken } from "@/lib/auth/tokens";
import { MAGIC_LINK_EXPIRY_MINUTES } from "@/lib/domain/invites";

function rando() {
  return `+1415555${Math.floor(Math.random() * 9000 + 1000)}`;
}

function futureExpiry() {
  return new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);
}

describe("phone change flow (token mechanics)", () => {
  it("can create a magic token for a new phone and find it", async () => {
    const newPhone = rando();
    const { hash } = generateToken();
    await createMagicToken({ phone: newPhone, tokenHash: hash, expiresAt: futureExpiry() });
    const found = await findUnusedMagicToken(hash);
    expect(found).not.toBeNull();
    expect(found!.phone).toBe(newPhone);
  });

  it("consuming the token and updating the user phone succeeds", async () => {
    const oldPhone = rando();
    const newPhone = rando();
    const user = await createUser({ name: "Change Me", phone: oldPhone });

    const { hash } = generateToken();
    await createMagicToken({ phone: newPhone, tokenHash: hash, expiresAt: futureExpiry() });
    const record = await findUnusedMagicToken(hash);
    await consumeMagicToken(record!.id);
    await updateUser(user.id, { phone: newPhone });

    const found = await findUserByPhone(newPhone);
    expect(found?.id).toBe(user.id);
    expect(found?.phone).toBe(newPhone);
  });

  it("old phone is free after the swap", async () => {
    const oldPhone = rando();
    const newPhone = rando();
    const user = await createUser({ name: "Swap Test", phone: oldPhone });

    const { hash } = generateToken();
    await createMagicToken({ phone: newPhone, tokenHash: hash, expiresAt: futureExpiry() });
    const record = await findUnusedMagicToken(hash);
    await consumeMagicToken(record!.id);
    await updateUser(user.id, { phone: newPhone });

    const foundOld = await findUserByPhone(oldPhone);
    expect(foundOld).toBeNull();
  });
});
