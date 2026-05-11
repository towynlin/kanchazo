import { describe, it, expect } from "vitest";
import { createUser } from "@/lib/db/queries/users";
import {
  createSession,
  findSessionByTokenHash,
  touchSession,
  expireSession,
  expireAllUserSessions,
} from "@/lib/db/queries/sessions";
import { hashToken } from "@/lib/auth/tokens";

function rando() {
  return `+1415555${Math.floor(Math.random() * 9000 + 1000)}`;
}

function makeHash() {
  return hashToken(`token_${Math.random().toString(36).slice(2)}`);
}

describe("sessions queries", () => {
  it("creates a session and finds it by token hash", async () => {
    const user = await createUser({ name: "Alice", phone: rando() });
    const tokenHash = makeHash();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const session = await createSession({ userId: user.id, tokenHash, expiresAt });
    expect(session.id).toBeTruthy();
    expect(session.userId).toBe(user.id);

    const found = await findSessionByTokenHash(tokenHash);
    expect(found?.id).toBe(session.id);
  });

  it("returns null for expired session", async () => {
    const user = await createUser({ name: "Bob", phone: rando() });
    const tokenHash = makeHash();
    const expiresAt = new Date(Date.now() - 1000); // already expired

    await createSession({ userId: user.id, tokenHash, expiresAt });
    const found = await findSessionByTokenHash(tokenHash);
    expect(found).toBeNull();
  });

  it("returns null for unknown token hash", async () => {
    const found = await findSessionByTokenHash("nonexistent");
    expect(found).toBeNull();
  });

  it("expires a single session", async () => {
    const user = await createUser({ name: "Carol", phone: rando() });
    const tokenHash = makeHash();
    const expiresAt = new Date(Date.now() + 86400000);

    const session = await createSession({ userId: user.id, tokenHash, expiresAt });
    await expireSession(session.id);

    const found = await findSessionByTokenHash(tokenHash);
    expect(found).toBeNull();
  });

  it("expires all sessions for a user", async () => {
    const user = await createUser({ name: "Dave", phone: rando() });
    const expiresAt = new Date(Date.now() + 86400000);

    const hash1 = makeHash();
    const hash2 = makeHash();
    await createSession({ userId: user.id, tokenHash: hash1, expiresAt });
    await createSession({ userId: user.id, tokenHash: hash2, expiresAt });

    await expireAllUserSessions(user.id);
    expect(await findSessionByTokenHash(hash1)).toBeNull();
    expect(await findSessionByTokenHash(hash2)).toBeNull();
  });

  it("touches session to extend expiry", async () => {
    const user = await createUser({ name: "Eve", phone: rando() });
    const tokenHash = makeHash();
    const expiresAt = new Date(Date.now() + 1000 * 60); // 1 min

    const session = await createSession({ userId: user.id, tokenHash, expiresAt });
    const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await touchSession(session.id, newExpiry);

    const found = await findSessionByTokenHash(tokenHash);
    expect(found).not.toBeNull();
  });
});
