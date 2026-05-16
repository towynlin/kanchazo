"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";
import InviteForm from "@/components/InviteForm";
import Avatar from "@/components/Avatar";

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
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  const myEntry = parents.find((p) => p.userId === currentUserId);

  async function handleRemoveMember(userId: string, name: string) {
    if (!confirm(`Remove ${name} from the team? This cannot be undone.`)) return;
    const res = await fetch(`/api/teams/${teamId}/members/${userId}`, { method: "DELETE" });
    if (res.ok) {
      setRemovedIds((s) => new Set(s).add(userId));
      router.refresh();
    }
  }

  const visibleCoaches = coaches.filter((m) => !removedIds.has(m.userId));
  const visibleParents = parents.filter((m) => !removedIds.has(m.userId));

  return (
    <>
      <div className="pb-4 px-[18px] pt-4">
        <Section
          title={`Coaches (${visibleCoaches.length})`}
          members={visibleCoaches}
          currentUserId={currentUserId}
          isCoach={isCoach}
          onRemove={isCoach ? handleRemoveMember : undefined}
        />
        <Section
          title={`Parents & Guardians (${visibleParents.length})`}
          members={visibleParents}
          onAddCoGuardian={
            myEntry?.players.length ? (playerIds) => setCoGuardianPlayerIds(playerIds) : undefined
          }
          currentUserId={currentUserId}
          isCoach={isCoach}
          onRemove={isCoach ? handleRemoveMember : undefined}
        />
        {isCoach && orphanPlayers.length > 0 && (
          <>
            <SectionHeader title={`Pending guardians (${orphanPlayers.length})`} />
            <div className="space-y-2">
              {orphanPlayers.map((p) => (
                <div
                  key={p.id}
                  className="bg-mk-surface rounded-mk-md border-[1.5px] border-mk-border-card px-3.5 py-2.5 flex items-center gap-3"
                >
                  <Avatar name={p.name} seed={p.id} />
                  <div className="flex-1 min-w-0">
                    <div className="font-body font-extrabold text-[14px] text-mk-text">
                      {p.name}
                    </div>
                    <div className="font-body font-bold text-[11px] text-mk-text-secondary">
                      Awaiting guardian
                    </div>
                  </div>
                  <span className="font-body font-extrabold text-[10px] bg-mk-maybe-bg text-mk-maybe-text px-2.5 py-1 rounded-full">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {isCoach && (
        <button
          onClick={() => setShowInvite(true)}
          aria-label="Invite someone"
          className="fixed bottom-24 right-5 w-14 h-14 bg-mk-sky text-white rounded-full shadow-mk-game text-2xl flex items-center justify-center z-10"
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

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-baseline justify-between mt-5 mb-[10px]">
      <h2 className="font-display font-extrabold text-[15px] text-mk-text">{title}</h2>
    </div>
  );
}

function Section({
  title,
  members,
  currentUserId,
  isCoach,
  onAddCoGuardian,
  onRemove,
}: {
  title: string;
  members: Member[];
  currentUserId?: string;
  isCoach?: boolean;
  onAddCoGuardian?: (playerIds: string[]) => void;
  onRemove?: (userId: string, name: string) => void;
}) {
  return (
    <>
      <SectionHeader title={title} />
      <div className="space-y-2">
        {members.map((m) => (
          <MemberRow
            key={m.userId}
            member={m}
            isCurrentUser={m.userId === currentUserId}
            isCoach={isCoach}
            onAddCoGuardian={onAddCoGuardian}
            onRemove={m.userId !== currentUserId ? onRemove : undefined}
          />
        ))}
      </div>
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
      className="ml-2 text-mk-text-secondary text-xs px-1.5 py-0.5 rounded-full border border-mk-border-card hover:text-mk-sky min-h-[44px] min-w-[44px] flex items-center justify-center"
    >
      {copied ? "✓" : "⎘"}
    </button>
  );
}

function MemberRow({
  member,
  isCurrentUser,
  isCoach,
  onAddCoGuardian,
  onRemove,
}: {
  member: Member;
  isCurrentUser?: boolean;
  isCoach?: boolean;
  onAddCoGuardian?: (playerIds: string[]) => void;
  onRemove?: (userId: string, name: string) => void;
}) {
  const { user, players } = member;
  const variant = member.role === "coach" ? "coach" : "player";
  return (
    <div className="bg-mk-surface rounded-mk-md border-[1.5px] border-mk-border-card px-3.5 py-2.5">
      <div className="flex items-center gap-3">
        <Avatar name={user.name} seed={member.userId} variant={variant} />
        <div className="flex-1 min-w-0">
          <div className="font-body font-extrabold text-[14px] text-mk-text">
            {user.name}
            {isCurrentUser && (
              <span className="ml-2 font-body font-bold text-[10px] text-mk-sky uppercase tracking-wider">
                You
              </span>
            )}
          </div>
          <div className="font-body font-bold text-[11px] text-mk-text-secondary capitalize">
            {member.role === "coach" ? "Coach" : "Parent / Guardian"}
          </div>
        </div>
        {isCoach && onRemove && !isCurrentUser && (
          <button
            onClick={() => onRemove(member.userId, user.name)}
            className="text-xs text-mk-no-text px-2 py-1 font-body font-bold min-h-0"
            style={{ minHeight: 0 }}
          >
            Remove
          </button>
        )}
      </div>
      {user.email && (
        <div className="flex items-center gap-1 mt-2">
          <a
            href={`mailto:${user.email}`}
            className="text-sm text-mk-sky flex-1 min-w-0 truncate font-body font-semibold"
          >
            {user.email}
          </a>
          <CopyButton value={user.email} />
        </div>
      )}
      <div className="flex items-center gap-1 mt-0.5">
        <a
          href={`tel:${user.phone}`}
          className="text-sm text-mk-sky flex-1 font-body font-semibold"
        >
          {user.phone}
        </a>
        <CopyButton value={user.phone} />
      </div>
      {players.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {players.map((p) => (
            <span
              key={p.id}
              className="font-body font-extrabold text-[10px] bg-mk-surface-blue text-mk-sky px-2.5 py-1 rounded-full border border-mk-border-card"
            >
              {p.name}
            </span>
          ))}
          {isCurrentUser && onAddCoGuardian && (
            <button
              onClick={() => onAddCoGuardian(players.map((p) => p.id))}
              className="font-body font-extrabold text-[10px] text-mk-sky px-2.5 py-1 rounded-full border border-mk-sky min-h-0"
              style={{ minHeight: 0 }}
            >
              + Co-guardian
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
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-mk-bg rounded-t-[40px] z-30 max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-mk-border-card flex items-center justify-between">
          <h2 className="font-display font-extrabold text-[18px] text-mk-text">Add co-guardian</h2>
          <button
            onClick={onDone}
            className="text-mk-text-secondary text-xl leading-none min-h-0"
            style={{ minHeight: "auto" }}
          >
            ✕
          </button>
        </div>
        {sent ? (
          <div className="p-6 text-center">
            <div className="text-4xl mb-3">✉️</div>
            <p className="font-display font-extrabold text-[16px] text-mk-text mb-1">
              Invite sent!
            </p>
            <button
              onClick={onDone}
              className="mt-4 w-full py-3 bg-mk-sky text-white rounded-mk-md font-body font-extrabold"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-4 pb-8">
            <div>
              <label className="block text-sm font-body font-bold text-mk-text mb-1">
                Share access for
              </label>
              <div className="flex flex-wrap gap-2">
                {myPlayers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlayer(p.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-body font-extrabold border ${
                      selectedIds.has(p.id)
                        ? "bg-mk-sky text-white border-mk-sky"
                        : "bg-mk-bg text-mk-text border-mk-border-card"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-body font-bold text-mk-text mb-1">
                Their phone
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 555 000 0000"
                className="w-full px-3 py-2.5 border border-mk-border-card rounded-mk-md text-base focus:outline-none focus:ring-2 focus:ring-mk-sky bg-mk-bg"
              />
            </div>
            <div>
              <label className="block text-sm font-body font-bold text-mk-text mb-1">
                Or their email{" "}
                <span className="text-mk-text-secondary font-normal">(optional)</span>
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="guardian@example.com"
                className="w-full px-3 py-2.5 border border-mk-border-card rounded-mk-md text-base focus:outline-none focus:ring-2 focus:ring-mk-sky bg-mk-bg"
              />
            </div>
            {error && <p className="text-mk-no-text text-sm">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={
                saving || selectedIds.size === 0 || (!contactPhone.trim() && !contactEmail.trim())
              }
              className="w-full py-3 bg-mk-sky text-white rounded-mk-md font-body font-extrabold text-base disabled:opacity-50"
            >
              {saving ? "Sending…" : "Send invite"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
