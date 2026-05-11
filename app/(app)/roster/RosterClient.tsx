"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import InviteForm from "@/components/InviteForm";

interface Member {
  userId: string;
  role: "parent" | "coach";
  user: { name: string; email: string | null; phone: string };
  players: { id: string; name: string }[];
}

interface Props {
  teamId: string;
  isCoach: boolean;
  currentUserId: string;
  coaches: Member[];
  parents: Member[];
  orphanPlayers: { id: string; name: string }[];
}

export default function RosterClient({
  teamId,
  isCoach,
  currentUserId,
  coaches,
  parents,
  orphanPlayers,
}: Props) {
  const [showInvite, setShowInvite] = useState(false);
  const [coGuardianPlayerIds, setCoGuardianPlayerIds] = useState<string[] | null>(null);

  const myEntry = parents.find((p) => p.userId === currentUserId);

  return (
    <>
      <div className="pb-4">
        <Section title={`Coaches (${coaches.length})`} members={coaches} />
        <Section
          title={`Parents & Guardians (${parents.length})`}
          members={parents}
          onAddCoGuardian={
            myEntry?.players.length ? (playerIds) => setCoGuardianPlayerIds(playerIds) : undefined
          }
          currentUserId={currentUserId}
        />
        {isCoach && orphanPlayers.length > 0 && (
          <>
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 mt-2">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Pending guardians ({orphanPlayers.length})
              </h2>
            </div>
            {orphanPlayers.map((p) => (
              <div
                key={p.id}
                className="px-4 py-3 border-b border-gray-100 flex items-center justify-between"
              >
                <div>
                  <span className="font-medium text-gray-900">{p.name}</span>
                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">
                    Awaiting guardian
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {isCoach && (
        <button
          onClick={() => setShowInvite(true)}
          aria-label="Invite someone"
          className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg text-2xl flex items-center justify-center z-10"
        >
          +
        </button>
      )}

      {showInvite && (
        <InviteForm
          teamId={teamId}
          onInvited={() => setShowInvite(false)}
          onClose={() => setShowInvite(false)}
        />
      )}

      {coGuardianPlayerIds && myEntry && (
        <CoGuardianInviteModal
          teamId={teamId}
          myPlayers={myEntry.players}
          initialPlayerIds={coGuardianPlayerIds}
          onDone={() => setCoGuardianPlayerIds(null)}
        />
      )}
    </>
  );
}

function Section({
  title,
  members,
  currentUserId,
  onAddCoGuardian,
}: {
  title: string;
  members: Member[];
  currentUserId?: string;
  onAddCoGuardian?: (playerIds: string[]) => void;
}) {
  return (
    <>
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 mt-2 first:mt-0">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h2>
      </div>
      {members.map((m) => (
        <MemberRow
          key={m.userId}
          member={m}
          isCurrentUser={m.userId === currentUserId}
          onAddCoGuardian={onAddCoGuardian}
        />
      ))}
    </>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy(e: MouseEvent) {
    e.preventDefault();
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={handleCopy}
      aria-label={`Copy ${value}`}
      className="ml-2 text-gray-400 hover:text-gray-600 text-xs px-1.5 py-0.5 rounded border border-gray-200 hover:border-gray-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
    >
      {copied ? "✓" : "⎘"}
    </button>
  );
}

function MemberRow({
  member,
  isCurrentUser,
  onAddCoGuardian,
}: {
  member: Member;
  isCurrentUser?: boolean;
  onAddCoGuardian?: (playerIds: string[]) => void;
}) {
  const { user, players } = member;
  return (
    <div className="px-4 py-3 border-b border-gray-100">
      <div className="font-medium text-gray-900 mb-1">{user.name}</div>
      {user.email && (
        <div className="flex items-center gap-1 mt-0.5">
          <a
            href={`mailto:${user.email}`}
            className="text-sm text-blue-600 flex-1 min-w-0 truncate"
          >
            {user.email}
          </a>
          <CopyButton value={user.email} />
        </div>
      )}
      <div className="flex items-center gap-1 mt-0.5">
        <a href={`tel:${user.phone}`} className="text-sm text-blue-600 flex-1">
          {user.phone}
        </a>
        <CopyButton value={user.phone} />
      </div>
      {players.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {players.map((p) => (
            <span key={p.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
              {p.name}
            </span>
          ))}
          {isCurrentUser && onAddCoGuardian && (
            <button
              onClick={() => onAddCoGuardian(players.map((p) => p.id))}
              className="text-xs text-blue-600 px-2 py-0.5 rounded-full border border-blue-300"
            >
              + Add co-guardian
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CoGuardianInviteModal({
  teamId,
  myPlayers,
  initialPlayerIds,
  onDone,
}: {
  teamId: string;
  myPlayers: { id: string; name: string }[];
  initialPlayerIds: string[];
  onDone: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialPlayerIds));
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function togglePlayer(id: string) {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSubmit(e: MouseEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          invitedRole: "parent",
          contactPhone: contactPhone.trim() || null,
          contactEmail: contactEmail.trim() || null,
          intendedPlayerIds: [...selectedIds],
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
      <div className="fixed inset-0 bg-black/50 z-20" onClick={onDone} />
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-2xl z-30 max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold">Add co-guardian</h2>
          <button
            onClick={onDone}
            className="text-gray-400 text-xl leading-none min-h-0"
            style={{ minHeight: "auto" }}
          >
            ✕
          </button>
        </div>
        {sent ? (
          <div className="p-6 text-center">
            <div className="text-4xl mb-3">✉️</div>
            <p className="font-medium text-gray-900 mb-1">Invite sent!</p>
            <button
              onClick={onDone}
              className="mt-4 w-full py-3 bg-blue-600 text-white rounded-xl font-medium"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-4 pb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Share access for
              </label>
              <div className="flex flex-wrap gap-2">
                {myPlayers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlayer(p.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                      selectedIds.has(p.id)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Their phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 555 000 0000"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Or their email <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="guardian@example.com"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={
                saving || selectedIds.size === 0 || (!contactPhone.trim() && !contactEmail.trim())
              }
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-base disabled:opacity-50"
            >
              {saving ? "Sending…" : "Send invite"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
