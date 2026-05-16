"use client";

import { useState, useEffect, Suspense } from "react";
import type { FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";

interface InviteInfo {
  invitedRole: "parent" | "coach";
  team: { id: string; name: string } | null;
  contactPhone: string | null;
  contactEmail: string | null;
}

function InvitePageContent() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invitations/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 410 ? "expired" : "not-found");
        return r.json();
      })
      .then((data) => {
        setInfo(data);
        if (data.contactPhone) setPhone(data.contactPhone);
      })
      .catch((e) => setLoadError(e.message));
  }, [token]);

  async function handleAccept(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/invitations/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      if (!res.ok) {
        const d = await res.json();
        setSubmitError(d.error ?? "Failed to accept invite");
        return;
      }
      const d = await res.json();
      router.push(d.teamId ? "/schedule" : "/schedule");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center bg-mk-bg">
        <div>
          <div className="text-5xl mb-4">😕</div>
          <h1 className="font-display font-extrabold text-[22px] text-mk-text mb-2">
            {loadError === "expired" ? "Invite expired" : "Invite not found"}
          </h1>
          <p className="text-mk-text-secondary text-sm font-body">
            {loadError === "expired"
              ? "This invitation has expired or was already used. Ask your coach to resend."
              : "This invitation link isn't valid."}
          </p>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mk-bg">
        <div className="text-mk-text-muted font-body">Loading invitation…</div>
      </div>
    );
  }

  const roleLabel = info.invitedRole === "coach" ? "coach" : "parent/guardian";
  const teamLabel = info.team ? ` to ${info.team.name}` : "";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-mk-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚽</div>
          <h1 className="font-display font-extrabold text-[30px] text-mk-text mb-1 leading-tight">
            You&apos;re invited!
          </h1>
          <p className="text-mk-text-secondary text-sm font-body">
            Join{" "}
            <span className="text-mk-sky font-extrabold">
              Kanch<span className="text-mk-grass">azo</span>
            </span>{" "}
            as a {roleLabel}
            {teamLabel}.
          </p>
        </div>

        <form onSubmit={handleAccept} className="space-y-4">
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
              Phone number
            </label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+1 (555) 555-0123"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-3 py-3 border border-mk-border-card rounded-mk-md text-base bg-mk-bg
                         focus:outline-none focus:ring-2 focus:ring-mk-sky font-body"
            />
          </div>

          {submitError && <p className="text-mk-no-text text-sm font-body">{submitError}</p>}

          <p className="text-xs text-mk-text-muted font-body">
            After accepting, you&apos;ll receive a sign-in link to verify your number.
          </p>

          <button
            type="submit"
            disabled={submitting || !name || !phone}
            className="w-full py-3 px-4 bg-mk-sky text-white rounded-mk-md font-body font-extrabold text-base
                       disabled:opacity-50"
          >
            {submitting ? "Joining…" : "Accept invitation"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}
    >
      <InvitePageContent />
    </Suspense>
  );
}
