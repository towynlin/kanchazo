"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const COUNTRY_CODES = [
  { flag: "🇺🇸", label: "US / CA / PR / DO", dial: "+1", placeholder: "(555) 555-0123" },
  { flag: "🇲🇽", label: "Mexico", dial: "+52", placeholder: "55 1234 5678" },
  { flag: "🇧🇷", label: "Brazil", dial: "+55", placeholder: "11 91234-5678" },
  { flag: "🇦🇷", label: "Argentina", dial: "+54", placeholder: "11 1234-5678" },
  { flag: "🇨🇴", label: "Colombia", dial: "+57", placeholder: "300 123 4567" },
  { flag: "🇨🇱", label: "Chile", dial: "+56", placeholder: "9 1234 5678" },
  { flag: "🇵🇪", label: "Peru", dial: "+51", placeholder: "9 1234 5678" },
  { flag: "🇻🇪", label: "Venezuela", dial: "+58", placeholder: "212 123 4567" },
  { flag: "🇪🇨", label: "Ecuador", dial: "+593", placeholder: "9 1234 5678" },
  { flag: "🇬🇹", label: "Guatemala", dial: "+502", placeholder: "1234 5678" },
  { flag: "🇸🇻", label: "El Salvador", dial: "+503", placeholder: "7123 4567" },
  { flag: "🇭🇳", label: "Honduras", dial: "+504", placeholder: "9123 4567" },
  { flag: "🇳🇮", label: "Nicaragua", dial: "+505", placeholder: "8123 4567" },
  { flag: "🇨🇷", label: "Costa Rica", dial: "+506", placeholder: "8123 4567" },
  { flag: "🇪🇸", label: "Spain", dial: "+34", placeholder: "612 345 678" },
  { flag: "🇬🇧", label: "UK", dial: "+44", placeholder: "7700 900123" },
];

function AuthForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const router = useRouter();

  const [dialCode, setDialCode] = useState("+1");
  const [localPhone, setLocalPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectedCountry = COUNTRY_CODES.find((c) => c.dial === dialCode) ?? COUNTRY_CODES[0];
  const fullPhone = dialCode + localPhone.replace(/\D/g, "");

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Failed to send code");
      } else {
        setSent(true);
      }
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskey() {
    setLoading(true);
    setErr(null);
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const optRes = await fetch("/api/auth/passkey/auth/options", { method: "POST" });
      const options = await optRes.json();
      const credential = await startAuthentication({ optionsJSON: options });
      const verRes = await fetch("/api/auth/passkey/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credential),
      });
      if (verRes.ok) {
        router.push("/schedule");
      } else {
        setErr("Passkey authentication failed.");
      }
    } catch {
      setErr("Passkey authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-1">Kanchazo</h1>
          <p className="text-gray-500 text-sm">Youth sports team manager</p>
        </div>

        {(error === "invalid" || error === "missing") && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error === "invalid"
              ? "That sign-in link is invalid or has expired."
              : "Sign-in link is missing."}
          </div>
        )}

        {sent ? (
          <div className="text-center">
            <div className="text-4xl mb-4">📱</div>
            <h2 className="text-xl font-semibold mb-2">Check your messages</h2>
            <p className="text-gray-500 text-sm mb-6">
              We sent a sign-in link to {fullPhone}. It expires in 5 minutes.
            </p>
            <button
              onClick={() => {
                setSent(false);
                setLocalPhone("");
              }}
              className="text-blue-600 text-sm underline"
            >
              Try a different number
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={handlePasskey}
              disabled={loading}
              className="w-full mb-4 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium text-base
                         disabled:opacity-50 flex items-center justify-center gap-2"
            >
              🔑 Sign in with passkey
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-gray-400 text-xs">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <form onSubmit={handleSendOtp} className="space-y-3">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone number
                </label>
                <div className="flex">
                  <select
                    aria-label="Country code"
                    value={dialCode}
                    onChange={(e) => {
                      setDialCode(e.target.value);
                      setLocalPhone("");
                    }}
                    className="px-2 py-3 bg-gray-100 border border-gray-300 border-r-0 rounded-l-xl
                               text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                               focus:border-transparent"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.dial} value={c.dial}>
                        {c.flag} {c.dial}
                      </option>
                    ))}
                  </select>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder={selectedCountry.placeholder}
                    value={localPhone}
                    onChange={(e) => setLocalPhone(e.target.value)}
                    required
                    className="flex-1 px-3 py-3 border border-gray-300 rounded-r-xl text-base
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {err && <p className="text-red-600 text-sm">{err}</p>}

              <button
                type="submit"
                disabled={loading || !localPhone}
                className="w-full py-3 px-4 bg-gray-900 text-white rounded-xl font-medium text-base
                           disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send me a sign-in link"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}
    >
      <AuthForm />
    </Suspense>
  );
}
