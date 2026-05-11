"use client";

import { useState } from "react";

interface Props {
  teamId: string;
  onInvited: () => void;
  onClose: () => void;
}

export default function InviteForm({ teamId, onInvited, onClose }: Props) {
  const [invitedRole, setInvitedRole] = useState<"parent" | "coach">("parent");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [playerNames, setPlayerNames] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function addPlayer() {
    setPlayerNames((p) => [...p, ""]);
  }

  function removePlayer(i: number) {
    setPlayerNames((p) => p.filter((_, idx) => idx !== i));
  }

  function setPlayerName(i: number, val: string) {
    setPlayerNames((p) => p.map((n, idx) => (idx === i ? val : n)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const names = playerNames.map((n) => n.trim()).filter(Boolean);
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          invitedRole,
          contactPhone: contactPhone.trim() || null,
          contactEmail: contactEmail.trim() || null,
          playerNames: invitedRole === "parent" ? names : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to send invite");
        return;
      }
      setSent(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-20" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-2xl z-30 max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold">Invite someone</h2>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none min-h-0" style={{ minHeight: "auto" }}>✕</button>
        </div>

        {sent ? (
          <div className="p-6 text-center">
            <div className="text-4xl mb-3">✉️</div>
            <p className="font-medium text-gray-900 mb-1">Invite sent!</p>
            <p className="text-sm text-gray-500 mb-4">
              They'll receive a link to join the team.
            </p>
            <button
              onClick={onInvited}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4 pb-8">
            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                {(["parent", "coach"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setInvitedRole(r)}
                    className={`flex-1 py-2.5 text-sm font-medium capitalize
                      ${invitedRole === r ? "bg-blue-600 text-white" : "bg-white text-gray-600"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 555 000 0000"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-base
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="coach@example.com"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-base
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Player names for parent invites */}
            {invitedRole === "parent" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Player name(s)
                </label>
                {playerNames.map((name, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setPlayerName(i, e.target.value)}
                      placeholder="Alex Smith"
                      className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl text-base
                                 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {playerNames.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePlayer(i)}
                        className="px-3 text-gray-400 text-xl"
                      >
                        −
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPlayer}
                  className="text-sm text-blue-600 font-medium"
                >
                  + Add another player
                </button>
              </div>
            )}

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={saving || (!contactPhone.trim() && !contactEmail.trim())}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-base disabled:opacity-50"
            >
              {saving ? "Sending…" : "Send invite"}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
