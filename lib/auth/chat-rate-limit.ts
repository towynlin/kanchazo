// In-memory rate limit for chat sends: max 30 messages per minute per user
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 30;

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkChatRateLimit(userId: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const key = userId;
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (bucket.count >= MAX_PER_WINDOW) {
    return { allowed: false, reason: "Too many messages. Please slow down." };
  }

  bucket.count++;
  return { allowed: true };
}
