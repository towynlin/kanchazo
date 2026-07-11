"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  firstName: string;
  isRecovery: boolean;
}

export default function SetupClient({ firstName, isRecovery }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"passkey" | "codes">("passkey");
  const [passkeyDone, setPasskeyDone] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreatePasskey() {
    setWorking(true);
    setPasskeyError(null);
    try {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const optRes = await fetch("/api/auth/passkey/register/options", { method: "POST" });
      const options = await optRes.json();
      const credential = await startRegistration({ optionsJSON: options });
      const verRes = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credential),
      });
      if (!verRes.ok) throw new Error();
      setPasskeyDone(true);
      await goToCodes();
    } catch {
      setPasskeyError(
        "Couldn't create a passkey on this device. You can try again, or continue and add one later in Settings.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function goToCodes() {
    if (isRecovery) {
      // Recovering users keep their remaining codes; don't silently invalidate them.
      router.push("/schedule");
      return;
    }
    const res = await fetch("/api/auth/recovery-codes", { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      setCodes(d.codes);
    }
    setStep("codes");
  }

  async function handleCopyCodes() {
    if (!codes) return;
    await navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (step === "codes") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-mk-bg">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🗝️</div>
            <h1 className="font-display font-extrabold text-[24px] text-mk-text leading-tight mb-2">
              Save your recovery codes
            </h1>
            <p className="text-mk-text-secondary text-sm font-body">
              If you ever lose your passkey, one of these codes gets you back in. Each works once.
              Keep them somewhere safe — a notes app, password manager, or screenshot.
            </p>
          </div>

          {codes ? (
            <div className="grid grid-cols-2 gap-2 mb-4 bg-mk-surface border-[1.5px] border-mk-border-card rounded-mk-md p-4">
              {codes.map((c) => (
                <div key={c} className="font-mono text-sm text-mk-text text-center py-1">
                  {c}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-mk-no-text text-sm font-body mb-4 text-center">
              Couldn&apos;t generate codes right now — you can do it any time from Settings.
            </p>
          )}

          {codes && (
            <button
              onClick={handleCopyCodes}
              className="w-full mb-3 py-3 border-[1.5px] border-mk-sky text-mk-sky rounded-mk-md font-body font-extrabold text-sm"
            >
              {copied ? "Copied ✓" : "Copy all codes"}
            </button>
          )}

          <button
            onClick={() => router.push("/schedule")}
            className="w-full py-3 bg-mk-sky text-white rounded-mk-md font-body font-extrabold text-base"
          >
            I saved them — let&apos;s go!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-mk-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">{isRecovery ? "🔐" : "🎉"}</div>
          <h1 className="font-display font-extrabold text-[24px] text-mk-text leading-tight mb-2">
            {isRecovery ? `Let's secure your account, ${firstName}` : `Welcome, ${firstName}!`}
          </h1>
          <p className="text-mk-text-secondary text-sm font-body">
            {isRecovery
              ? "Set up a new passkey on this device so you can sign in with just your face or fingerprint next time."
              : "Create a passkey so you can sign in with just your face or fingerprint — no passwords, ever."}
          </p>
        </div>

        {passkeyError && <p className="text-mk-no-text text-sm font-body mb-4">{passkeyError}</p>}

        <button
          onClick={handleCreatePasskey}
          disabled={working || passkeyDone}
          className="w-full mb-3 py-3.5 px-4 bg-mk-sky text-white rounded-mk-md font-body font-extrabold text-base
                     disabled:opacity-50 flex items-center justify-center gap-2"
        >
          🔑 {working ? "Setting up…" : "Create my passkey"}
        </button>

        {passkeyError && (
          <button
            onClick={goToCodes}
            disabled={working}
            className="w-full py-3 text-mk-text-secondary text-sm font-body font-bold disabled:opacity-50"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
