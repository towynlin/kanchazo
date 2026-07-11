"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function RecoverLinkPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [userName, setUserName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/auth/recover-link?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? "This recovery link is invalid or has expired.");
        }
        return r.json();
      })
      .then((d) => setUserName(d.userName))
      .catch((e) => setLoadError(e.message));
  }, [token]);

  async function handleSignIn() {
    setSigningIn(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/recover-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Sign-in failed.");
        return;
      }
      router.push("/auth/setup?from=recovery");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSigningIn(false);
    }
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center bg-mk-bg">
        <div>
          <div className="text-5xl mb-4">😕</div>
          <h1 className="font-display font-extrabold text-[22px] text-mk-text mb-2">
            Link expired
          </h1>
          <p className="text-mk-text-secondary text-sm font-body">
            This sign-in link is invalid, expired, or already used. Ask your coach to send a new
            one.
          </p>
          <Link
            href="/auth"
            className="inline-block mt-4 text-mk-sky text-sm font-body font-bold underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!userName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mk-bg">
        <div className="text-mk-text-muted font-body">Checking your link…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-mk-bg">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-3">👋</div>
        <h1 className="font-display font-extrabold text-[26px] text-mk-text mb-2">
          Welcome back, {userName}!
        </h1>
        <p className="text-mk-text-secondary text-sm font-body mb-6">
          Tap below to get back into your account. You&apos;ll set up a new passkey right after.
        </p>

        {error && <p className="text-mk-no-text text-sm font-body mb-4">{error}</p>}

        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="w-full py-3.5 px-4 bg-mk-sky text-white rounded-mk-md font-body font-extrabold text-base
                     disabled:opacity-50"
        >
          {signingIn ? "Signing in…" : "Sign me in"}
        </button>
      </div>
    </div>
  );
}
