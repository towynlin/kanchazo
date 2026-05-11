"use client";

import { useState, useEffect, Suspense } from "react";
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

  async function handleAccept(e: React.FormEvent) {
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
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-xl font-bold mb-2">
            {loadError === "expired" ? "Invite expired" : "Invite not found"}
          </h1>
          <p className="text-gray-500 text-sm">
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading invitation…</div>
      </div>
    );
  }

  const roleLabel = info.invitedRole === "coach" ? "coach" : "parent/guardian";
  const teamLabel = info.team ? ` to ${info.team.name}` : "";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-2xl font-bold mb-1">You're invited!</h1>
          <p className="text-gray-500 text-sm">
            Join Kanchazo as a {roleLabel}{teamLabel}.
          </p>
        </div>

        <form onSubmit={handleAccept} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
            <input
              type="text"
              autoComplete="name"
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-3 border border-gray-300 rounded-xl text-base
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+1 (555) 555-0123"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-3 py-3 border border-gray-300 rounded-xl text-base
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {submitError && <p className="text-red-600 text-sm">{submitError}</p>}

          <p className="text-xs text-gray-400">
            After accepting, you&apos;ll receive a sign-in link to verify your number.
          </p>

          <button
            type="submit"
            disabled={submitting || !name || !phone}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-medium text-base
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <InvitePageContent />
    </Suspense>
  );
}
