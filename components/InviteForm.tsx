"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import ShareLink from "@/components/ShareLink";

interface Props {
  teamId: string;
  onInvited: () => void;
  onClose: () => void;
}

export default function InviteForm({ teamId, onInvited, onClose }: Props) {
  const [invitedRole, setInvitedRole] = useState<"parent" | "coach">("parent");
  const [selfGuardian, setSelfGuardian] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [playerNames, setPlayerNames] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  function addPlayer() {
    setPlayerNames((p) => [...p, ""]);
  }

  function removePlayer(i: number) {
    setPlayerNames((p) => p.filter((_, idx) => idx !== i));
  }

  function setPlayerName(i: number, val: string) {
    setPlayerNames((p) => p.map((n, idx) => (idx === i ? val : n)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const names = playerNames.map((n) => n.trim()).filter(Boolean);

      if (invitedRole === "parent" && selfGuardian) {
        for (const name of names) {
          const res = await fetch(`/api/teams/${teamId}/players`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, selfGuardian: true }),
          });
          if (!res.ok) {
            const d = await res.json();
            setError(d.error ?? "Failed to add player");
            return;
          }
        }
        onInvited();
        return;
      }

      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          invitedRole,
          contactEmail: contactEmail.trim() || null,
          playerNames: invitedRole === "parent" ? names : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to create invite");
        return;
      }
      const d = await res.json();
      setInviteUrl(d.url);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-20" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-mk-bg rounded-t-[40px] z-30 max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-mk-border-card flex items-center justify-between">
          <h2 className="font-display font-extrabold text-[18px] text-mk-text">Invite someone</h2>
          <button
            onClick={onClose}
            className="text-mk-text-secondary text-xl leading-none min-h-0"
            style={{ minHeight: "auto" }}
          >
            ✕
          </button>
        </div>

        {inviteUrl ? (
          <div className="p-6 pb-8">
            <div className="text-center mb-4">
              <div className="text-4xl mb-3">🔗</div>
              <p className="font-display font-extrabold text-[16px] text-mk-text mb-1">
                Invite link ready!
              </p>
              <p className="text-sm text-mk-text-secondary font-body">
                Send it however you like — text, WhatsApp, email. It expires in 7 days.
                {contactEmail.trim() && " We also emailed it for you."}
              </p>
            </div>
            <ShareLink url={inviteUrl} shareText="Join our team on Kanchazo!" />
            <button
              onClick={onInvited}
              className="mt-4 w-full py-3 bg-mk-sky text-white rounded-mk-md font-body font-extrabold"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4 pb-8">
            {/* Role */}
            <div>
              <label className="block text-sm font-body font-bold text-mk-text mb-1">Role</label>
              <div className="flex rounded-full overflow-hidden border-[1.5px] border-mk-border-card">
                {(["parent", "coach"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setInvitedRole(r)}
                    className={`flex-1 py-2.5 text-sm font-body font-extrabold capitalize ${
                      invitedRole === r ? "bg-mk-sky text-white" : "bg-mk-bg text-mk-text-secondary"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Self-guardian toggle */}
            {invitedRole === "parent" && (
              <button
                type="button"
                onClick={() => setSelfGuardian((v) => !v)}
                className={`w-full py-2.5 px-4 rounded-mk-md border-[1.5px] text-sm font-body font-extrabold text-left flex items-center gap-3 ${
                  selfGuardian
                    ? "border-mk-sky bg-mk-surface-blue text-mk-sky"
                    : "border-mk-border-card bg-mk-bg text-mk-text-secondary"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded border-[1.5px] flex-shrink-0 flex items-center justify-center text-[10px] ${
                    selfGuardian ? "border-mk-sky bg-mk-sky text-white" : "border-mk-border-card"
                  }`}
                >
                  {selfGuardian ? "✓" : ""}
                </span>
                I&apos;m their guardian
              </button>
            )}

            {/* Optional email — hidden when coach is adding their own child */}
            {!(invitedRole === "parent" && selfGuardian) && (
              <div>
                <label className="block text-sm font-body font-bold text-mk-text mb-1">
                  Email <span className="text-mk-text-muted font-normal">(optional)</span>
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="w-full px-3 py-2.5 border border-mk-border-card rounded-mk-md text-base bg-mk-bg
                             focus:outline-none focus:ring-2 focus:ring-mk-sky font-body"
                />
                <p className="mt-1 text-xs text-mk-text-muted font-body">
                  You&apos;ll get a link to share either way — add an email to also send it there.
                </p>
              </div>
            )}

            {/* Player names for parent invites */}
            {invitedRole === "parent" && (
              <div>
                <label className="block text-sm font-body font-bold text-mk-text mb-1">
                  Player name(s)
                </label>
                {playerNames.map((name, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setPlayerName(i, e.target.value)}
                      placeholder="Alex Smith"
                      className="flex-1 px-3 py-2.5 border border-mk-border-card rounded-mk-md text-base bg-mk-bg
                                 focus:outline-none focus:ring-2 focus:ring-mk-sky font-body"
                    />
                    {playerNames.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePlayer(i)}
                        className="px-3 text-mk-text-secondary text-xl"
                      >
                        −
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPlayer}
                  className="text-sm text-mk-sky font-body font-extrabold"
                >
                  + Add another player
                </button>
              </div>
            )}

            {error && <p className="text-mk-no-text text-sm font-body">{error}</p>}

            <button
              type="submit"
              disabled={saving || (invitedRole === "parent" && !playerNames.some((n) => n.trim()))}
              className="w-full py-3 bg-mk-sky text-white rounded-mk-md font-body font-extrabold text-base disabled:opacity-50"
            >
              {saving
                ? "Saving…"
                : invitedRole === "parent" && selfGuardian
                  ? "Add to roster"
                  : "Create invite link"}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
