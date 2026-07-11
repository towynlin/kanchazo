// In-memory rate limit for recovery redemption attempts: max 10 per 15 minutes per client
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 10;

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRecoveryRateLimit(key: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (bucket.count >= MAX_PER_WINDOW) {
    return { allowed: false, reason: "Too many attempts. Please try again later." };
  }

  bucket.count++;
  return { allowed: true };
}
