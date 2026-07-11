"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RecoverPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "That code didn't work.");
        return;
      }
      // Signed in — prompt them to set up a fresh passkey right away
      router.push("/auth/setup?from=recovery");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-mk-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🛟</div>
          <h1 className="font-display font-extrabold text-[26px] text-mk-text leading-tight mb-2">
            Use a recovery code
          </h1>
          <p className="text-mk-text-secondary text-sm font-body">
            Enter one of the recovery codes you saved when you joined. Each code works once.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-body font-bold text-mk-text mb-1">
              Recovery code
            </label>
            <input
              id="code"
              type="text"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              placeholder="K7MPQ-2XW9T"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="w-full px-3 py-3 border border-mk-border-card rounded-mk-md text-base bg-mk-bg
                         font-mono tracking-widest text-center uppercase
                         focus:outline-none focus:ring-2 focus:ring-mk-sky"
            />
          </div>

          {error && <p className="text-mk-no-text text-sm font-body">{error}</p>}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full py-3 px-4 bg-mk-sky text-white rounded-mk-md font-body font-extrabold text-base
                       disabled:opacity-50"
          >
            {loading ? "Checking…" : "Sign in"}
          </button>
        </form>

        <div className="text-center mt-6 space-y-3">
          <p className="text-mk-text-muted text-xs font-body">
            No codes left? Ask your coach to send you a sign-in link from the roster screen.
          </p>
          <Link href="/auth" className="block text-mk-sky text-sm font-body font-bold underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
