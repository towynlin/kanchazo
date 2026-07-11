import { randomBytes } from "crypto";

// Alphabet excludes easily-confused characters (0/O, 1/I/L, U/V ambiguity kept minimal)
export const RECOVERY_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
export const RECOVERY_CODE_LENGTH = 10; // characters, excluding the dash
export const RECOVERY_CODE_COUNT = 8;

/** Generate one recovery code like "K7MPQ-2XW9T". */
export function generateRecoveryCode(): string {
  const bytes = randomBytes(RECOVERY_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < RECOVERY_CODE_LENGTH; i++) {
    code += RECOVERY_CODE_ALPHABET[bytes[i] % RECOVERY_CODE_ALPHABET.length];
  }
  return formatRecoveryCode(code);
}

/** Insert the display dash: "K7MPQ2XW9T" → "K7MPQ-2XW9T". */
export function formatRecoveryCode(normalized: string): string {
  const half = RECOVERY_CODE_LENGTH / 2;
  return `${normalized.slice(0, half)}-${normalized.slice(half)}`;
}

/** Uppercase and strip everything except letters/digits, so user input is forgiving. */
export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[^2-9A-Z]/g, "");
}

export function isWellFormedRecoveryCode(input: string): boolean {
  const normalized = normalizeRecoveryCode(input);
  return (
    normalized.length === RECOVERY_CODE_LENGTH &&
    [...normalized].every((c) => RECOVERY_CODE_ALPHABET.includes(c))
  );
}
