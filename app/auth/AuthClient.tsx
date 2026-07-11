"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AuthClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
        setErr("Passkey sign-in didn't work. Try again, or use a recovery code below.");
      }
    } catch {
      setErr("Passkey sign-in didn't work. Try again, or use a recovery code below.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-mk-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display font-extrabold text-[34px] text-mk-sky leading-none mb-2">
            Kanch<span className="text-mk-grass">azo</span>
          </h1>
          <p
            className="font-body font-bold text-[11px] text-mk-text-secondary uppercase"
            style={{ letterSpacing: "0.14em" }}
          >
            Youth sports team manager
          </p>
        </div>

        <button
          onClick={handlePasskey}
          disabled={loading}
          className="w-full mb-4 py-3.5 px-4 bg-mk-sky text-white rounded-mk-md font-body font-extrabold text-base
                     disabled:opacity-50 flex items-center justify-center gap-2"
        >
          🔑 {loading ? "Signing in…" : "Sign in with passkey"}
        </button>

        {err && <p className="text-mk-no-text text-sm font-body mb-4 text-center">{err}</p>}

        <div className="text-center space-y-3">
          <Link
            href="/auth/recover"
            className="block text-mk-sky text-sm font-body font-bold underline"
          >
            Lost your passkey? Use a recovery code
          </Link>
          <p className="text-mk-text-muted text-xs font-body">
            New here? Ask your coach for an invite link.
            <br />
            Locked out with no recovery codes? Your coach can send you a sign-in link.
          </p>
        </div>
      </div>
    </div>
  );
}
