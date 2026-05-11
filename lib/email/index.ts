import type { EmailProvider } from "./interface";
import { LoggerEmailProvider } from "./logger";
import { ResendEmailProvider } from "./resend";

let _provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (_provider) return _provider;
  const name = process.env.EMAIL_PROVIDER ?? "logger";
  if (name === "resend") {
    _provider = new ResendEmailProvider();
  } else {
    _provider = new LoggerEmailProvider();
  }
  return _provider;
}

export type { EmailProvider };
