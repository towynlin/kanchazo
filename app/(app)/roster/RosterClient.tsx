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
  coaches: Member[];
  parents: Member[];
}

export default function RosterClient({ teamId, isCoach, coaches, parents }: Props) {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <>
      <div className="pb-4">
        <Section title={`Coaches (${coaches.length})`} members={coaches} />
        <Section title={`Parents & Guardians (${parents.length})`} members={parents} />
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
    </>
  );
}

function Section({ title, members }: { title: string; members: Member[] }) {
  return (
    <>
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 mt-2 first:mt-0">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h2>
      </div>
      {members.map((m) => (
        <MemberRow key={m.userId} member={m} />
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

function MemberRow({ member }: { member: Member }) {
  const { user, players } = member;
  return (
    <div className="px-4 py-3 border-b border-gray-100">
      <div className="font-medium text-gray-900 mb-1">{user.name}</div>
      {user.email && (
        <div className="flex items-center gap-1 mt-0.5">
          <a href={`mailto:${user.email}`} className="text-sm text-blue-600 flex-1 min-w-0 truncate">
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
        </div>
      )}
    </div>
  );
}
