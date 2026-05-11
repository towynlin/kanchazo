import { countRecentMagicTokens } from "@/lib/db/queries/magic-tokens";

const SMS_PER_30S = 1;
const SMS_PER_HOUR = 5;

export async function checkSmsRateLimit(phone: string): Promise<
  { allowed: true } | { allowed: false; reason: string }
> {
  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [recent30s, recentHour] = await Promise.all([
    countRecentMagicTokens(phone, thirtySecondsAgo),
    countRecentMagicTokens(phone, oneHourAgo),
  ]);

  if (recent30s >= SMS_PER_30S) {
    return { allowed: false, reason: "Please wait 30 seconds before requesting another code." };
  }
  if (recentHour >= SMS_PER_HOUR) {
    return { allowed: false, reason: "Too many requests. Please try again in an hour." };
  }
  return { allowed: true };
}
