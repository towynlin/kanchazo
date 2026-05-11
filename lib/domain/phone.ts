import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";

export function normalizePhone(raw: string): string | null {
  if (!raw || raw.trim() === "") return null;
  try {
    // Try parsing as-is (handles E.164 and international formats)
    const parsed = parsePhoneNumber(raw, "US");
    if (parsed && parsed.isValid()) {
      return parsed.format("E.164");
    }
    return null;
  } catch {
    return null;
  }
}

export function isValidE164(s: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(s) && isValidPhoneNumber(s);
}
