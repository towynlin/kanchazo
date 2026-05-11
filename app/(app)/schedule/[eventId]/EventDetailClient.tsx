"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AvailabilitySummary } from "@/lib/domain/availability";
import EditEventModal from "@/components/EditEventModal";

interface EventData {
  id: string;
  teamId: string;
  kind: string;
  status: string;
  location: string;
  opponentName: string | null;
  isHome: boolean | null;
  notes: string | null;
  startsAt: string;
  endsAt: string | null;
  title: string;
  dateLabel: string;
  timeLabel: string;
  isCancelled: boolean;
}

interface Props {
  event: EventData;
  isCoach: boolean;
  players: Array<{ id: string; name: string; isMyPlayer: boolean }>;
  availability: Record<string, "yes" | "no" | "maybe">;
  summary: AvailabilitySummary;
}

const STATUS_LABELS = { yes: "Yes ✓", no: "No ✗", maybe: "Maybe ?" } as const;
const STATUS_COLORS = {
  yes: "bg-green-100 text-green-700",
  no: "bg-red-100 text-red-700",
  maybe: "bg-yellow-100 text-yellow-700",
} as const;

export default function EventDetailClient({ event, isCoach, players, availability: initAvail, summary }: Props) {
  const router = useRouter();
  const [availability, setAvailability] = useState(initAvail);
  const [notes, setNotes] = useState(event.notes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  async function setAvail(playerId: string, status: "yes" | "no" | "maybe") {
    const prev = availability[playerId];
    setAvailability((a) => ({ ...a, [playerId]: status }));
    try {
      const res = await fetch(`/api/teams/${event.teamId}/events/${event.id}/availability`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setAvailability((a) => ({ ...a, [playerId]: prev ?? "maybe" }));
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    try {
      await fetch(`/api/teams/${event.teamId}/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      setEditingNotes(false);
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this event? Availability history will be preserved.")) return;
    setCancelling(true);
    await fetch(`/api/teams/${event.teamId}/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    router.refresh();
    setCancelling(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this event permanently? This cannot be undone.")) return;
    await fetch(`/api/teams/${event.teamId}/events/${event.id}`, { method: "DELETE" });
    router.push("/schedule");
  }

  const myPlayers = players.filter((p) => p.isMyPlayer);
  const otherPlayers = players.filter((p) => !p.isMyPlayer);

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={`text-xl font-bold ${event.isCancelled ? "line-through text-gray-400" : ""}`}>
                {event.title}
              </h1>
              {event.isCancelled && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">
                  Cancelled
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">{event.dateLabel} · {event.timeLabel}</p>
            <p className="text-sm text-gray-600 mt-0.5">📍 {event.location}</p>
          </div>
        </div>
      </div>

      {/* Availability summary */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex gap-4 text-sm">
          <span className="text-green-700 font-medium">{summary.yes} yes</span>
          <span className="text-yellow-700 font-medium">{summary.maybe} maybe</span>
          <span className="text-red-700 font-medium">{summary.no} no</span>
          {summary.unanswered > 0 && (
            <span className="text-gray-500">{summary.unanswered} unanswered</span>
          )}
        </div>
      </div>

      {/* My players */}
      {myPlayers.length > 0 && !event.isCancelled && (
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            My players
          </h3>
          <div className="space-y-2">
            {myPlayers.map((p) => {
              const status = availability[p.id] ?? "maybe";
              return (
                <div key={p.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{p.name}</span>
                  <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
                    {(["yes", "maybe", "no"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setAvail(p.id, s)}
                        className={`px-3 py-1.5 min-h-[36px] font-medium transition-colors
                          ${status === s ? STATUS_COLORS[s] : "bg-white text-gray-600"}`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All players */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          All players ({players.length})
        </h3>
        <div className="space-y-1">
          {players.map((p) => {
            const status = availability[p.id] ?? "maybe";
            return (
              <div key={p.id} className="flex items-center justify-between py-1">
                <span className={`text-sm ${p.isMyPlayer ? "font-medium" : "text-gray-700"}`}>
                  {p.name}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[status]}`}>
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</h3>
          {isCoach && !editingNotes && (
            <button
              onClick={() => setEditingNotes(true)}
              className="text-xs text-blue-600 min-h-0"
              style={{ minHeight: "auto" }}
            >
              Edit
            </button>
          )}
        </div>
        {isCoach && editingNotes ? (
          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none min-h-[80px]
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={saveNotes}
                disabled={savingNotes}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium disabled:opacity-50"
              >
                {savingNotes ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setEditingNotes(false)}
                className="px-3 py-1.5 text-gray-600 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {notes || <span className="text-gray-400 italic">No notes</span>}
          </p>
        )}
      </div>

      {/* Coach actions */}
      {isCoach && (
        <div className="px-4 py-3 space-y-2">
          {!event.isCancelled && (
            <button
              onClick={() => setShowEdit(true)}
              className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium"
            >
              Edit event
            </button>
          )}
          {!event.isCancelled && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full py-3 border border-yellow-400 text-yellow-700 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {cancelling ? "Cancelling…" : "Cancel event"}
            </button>
          )}
          <button
            onClick={handleDelete}
            className="w-full py-3 border border-red-300 text-red-600 rounded-xl text-sm font-medium"
          >
            Delete event
          </button>
        </div>
      )}

      {showEdit && (
        <EditEventModal
          event={{
            id: event.id,
            teamId: event.teamId,
            kind: event.kind as "game" | "practice",
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            location: event.location,
            opponentName: event.opponentName,
            isHome: event.isHome,
            notes: event.notes,
          }}
          onSaved={() => { setShowEdit(false); router.refresh(); }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
