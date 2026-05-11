import type { SmsProvider } from "./interface";
import { LoggerSmsProvider } from "./logger";
import { TwilioSmsProvider } from "./twilio";

let _provider: SmsProvider | null = null;

export function getSmsProvider(): SmsProvider {
  if (_provider) return _provider;
  const name = process.env.SMS_PROVIDER ?? "logger";
  if (name === "twilio") {
    _provider = new TwilioSmsProvider();
  } else {
    _provider = new LoggerSmsProvider();
  }
  return _provider;
}

export type { SmsProvider };
