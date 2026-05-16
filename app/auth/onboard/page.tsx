"use client";

import { useState, Suspense } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function OnboardForm() {
  const params = useSearchParams();
  const phone = params.get("phone") ?? "";
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name, email: email || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create account");
      } else {
        router.push("/schedule");
      }
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
          <div className="text-4xl mb-3">🎉</div>
          <h1 className="font-display font-extrabold text-[30px] text-mk-text leading-tight mb-2">
            Welcome to{" "}
            <span className="text-mk-sky">
              Kanch<span className="text-mk-grass">azo</span>
            </span>
            !
          </h1>
          <p className="text-mk-text-secondary text-sm font-body">
            Just a couple details to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-body font-bold text-mk-text mb-1">Your name</label>
            <input
              type="text"
              autoComplete="name"
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-3 border border-mk-border-card rounded-mk-md text-base bg-mk-bg
                         focus:outline-none focus:ring-2 focus:ring-mk-sky font-body"
            />
          </div>

          <div>
            <label className="block text-sm font-body font-bold text-mk-text mb-1">
              Email <span className="text-mk-text-muted font-normal">(optional)</span>
            </label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-3 border border-mk-border-card rounded-mk-md text-base bg-mk-bg
                         focus:outline-none focus:ring-2 focus:ring-mk-sky font-body"
            />
          </div>

          {error && <p className="text-mk-no-text text-sm font-body">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name}
            className="w-full py-3 px-4 bg-mk-sky text-white rounded-mk-md font-body font-extrabold text-base
                       disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Get started"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}
    >
      <OnboardForm />
    </Suspense>
  );
}
