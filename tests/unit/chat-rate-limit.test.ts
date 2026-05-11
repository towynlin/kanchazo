import { describe, it, expect, beforeAll } from "vitest";

let checkChatRateLimit: typeof import("@/lib/auth/chat-rate-limit").checkChatRateLimit;

// We need a fresh module for each test since the rate limiter keeps in-memory state
// Use different user IDs to avoid state pollution between tests
let counter = 0;
function uniqueUserId() {
  return `user-${Date.now()}-${++counter}`;
}

describe("chat rate limiting", () => {
  beforeAll(async () => {
    const mod = await import("@/lib/auth/chat-rate-limit");
    checkChatRateLimit = mod.checkChatRateLimit;
  });

  it("allows a single message", () => {
    const userId = uniqueUserId();
    const result = checkChatRateLimit(userId);
    expect(result.allowed).toBe(true);
  });

  it("allows up to 30 messages", () => {
    const userId = uniqueUserId();
    for (let i = 0; i < 29; i++) {
      const r = checkChatRateLimit(userId);
      expect(r.allowed).toBe(true);
    }
    // 30th message
    const r30 = checkChatRateLimit(userId);
    expect(r30.allowed).toBe(true);
  });

  it("blocks the 31st message in the same window", () => {
    const userId = uniqueUserId();
    for (let i = 0; i < 30; i++) {
      checkChatRateLimit(userId);
    }
    const blocked = checkChatRateLimit(userId);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toContain("slow down");
  });

  it("does not affect other users", () => {
    const user1 = uniqueUserId();
    const user2 = uniqueUserId();
    for (let i = 0; i < 30; i++) {
      checkChatRateLimit(user1);
    }
    // user1 is blocked, user2 should be fine
    const r1 = checkChatRateLimit(user1);
    const r2 = checkChatRateLimit(user2);
    expect(r1.allowed).toBe(false);
    expect(r2.allowed).toBe(true);
  });
});
