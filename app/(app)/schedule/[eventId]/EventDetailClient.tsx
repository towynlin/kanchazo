"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AvailabilitySummary } from "@/lib/domain/availability";
import EditEventModal from "@/components/EditEventModal";
import Avatar from "@/components/Avatar";
import GrassStripe from "@/components/GrassStripe";

interface EventData {
  id: string;
  teamId: string;
  kind: string;
  status: string;
  location: string;
  opponentName: string | null;
  isHome: boolean | null;
  notes: string | null;
  notesUpdatedAt: string | null;
  notesEditorName: string | null;
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

const STATUS_LABELS = { yes: "In!", no: "Can't", maybe: "Maybe" } as const;
const STATUS_BADGE = {
  yes: "bg-mk-yes-bg text-mk-yes-text",
  maybe: "bg-mk-maybe-bg text-mk-maybe-text",
  no: "bg-mk-no-bg text-mk-no-text",
} as const;
const STATUS_BADGE_LABEL = {
  yes: "✓ In!",
  maybe: "Maybe",
  no: "Can't make it",
} as const;

export default function EventDetailClient({
  event,
  isCoach,
  players,
  availability: initAvail,
  summary,
}: Props) {
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
      router.refresh();
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
  const showFieldStripe = event.kind === "game" && !event.isCancelled;

  return (
    <div className="pb-8">
      {/* Hero card */}
      <div className="px-[18px] pt-4">
        <div className="rounded-mk-lg border-[1.5px] border-mk-border-card shadow-mk-game overflow-hidden bg-mk-bg">
          <div className="bg-mk-surface-blue px-5 pt-4 pb-4">
            <div
              className="font-body font-bold text-[10px] text-mk-sky uppercase mb-1"
              style={{ letterSpacing: "0.14em" }}
            >
              {event.kind === "game" ? "⚽ Game day" : "🏃 Practice"} · {event.dateLabel}
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <h1
                className={`font-display font-extrabold text-[22px] text-mk-text leading-tight ${event.isCancelled ? "line-through text-mk-text-secondary" : ""}`}
              >
                {event.title}
              </h1>
              {event.isCancelled && (
                <span className="font-body font-extrabold text-[10px] bg-mk-no-bg text-mk-no-text px-2.5 py-1 rounded-full shrink-0">
                  Cancelled
                </span>
              )}
            </div>
            <p className="font-body font-bold text-[11px] text-mk-text-secondary mt-1">
              {event.timeLabel}
            </p>
          </div>
          {showFieldStripe && <GrassStripe />}
          <div className="bg-mk-bg px-5 py-3 flex items-center gap-2">
            <span aria-hidden className="inline-block w-[6px] h-[6px] rounded-full bg-mk-grass" />
            <span className="font-body font-bold text-[11px] text-mk-text-secondary">
              {event.location}
            </span>
          </div>
        </div>
      </div>

      {/* Availability summary stat pills */}
      <div className="grid grid-cols-3 gap-[10px] mt-3 px-[18px]">
        {(
          [
            { value: summary.yes, label: "In", color: "text-mk-yes-text" },
            { value: summary.maybe, label: "Maybe", color: "text-mk-maybe-text" },
            { value: summary.no, label: "Out", color: "text-mk-no-text" },
          ] as const
        ).map((p) => (
          <div
            key={p.label}
            className="bg-mk-surface rounded-mk-md border-[1.5px] border-mk-border py-3 text-center"
          >
            <div className={`font-display font-extrabold text-[22px] leading-none ${p.color}`}>
              {p.value}
            </div>
            <div
              className="font-body font-bold text-[9px] text-mk-text-muted uppercase mt-1"
              style={{ letterSpacing: "0.12em" }}
            >
              {p.label}
            </div>
          </div>
        ))}
      </div>
      {summary.unanswered > 0 && (
        <p className="px-[18px] mt-2 font-body font-bold text-[11px] text-mk-text-secondary">
          {summary.unanswered} no reply
        </p>
      )}

      {/* My players — parents edit their own here; coaches edit everyone in the full list below */}
      {!isCoach && myPlayers.length > 0 && !event.isCancelled && (
        <div className="px-[18px] mt-5">
          <h3 className="font-display font-extrabold text-[15px] text-mk-text mb-[10px]">
            My players
          </h3>
          <div className="space-y-2">
            {myPlayers.map((p) => {
              const status = availability[p.id] ?? "maybe";
              return (
                <div
                  key={p.id}
                  className="bg-mk-surface rounded-mk-md border-[1.5px] border-mk-border-card px-3.5 py-2.5 flex items-center gap-3"
                >
                  <Avatar name={p.name} seed={p.id} />
                  <span className="font-body font-extrabold text-[14px] text-mk-text flex-1 min-w-0 truncate">
                    {p.name}
                  </span>
                  <div className="flex rounded-full overflow-hidden border-[1.5px] border-mk-border-card text-xs">
                    {(["yes", "maybe", "no"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setAvail(p.id, s)}
                        className={`px-3 py-1.5 min-h-[36px] font-body font-extrabold text-[11px] transition-colors ${
                          status === s ? STATUS_BADGE[s] : "bg-mk-bg text-mk-text-secondary"
                        }`}
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
      <div className="px-[18px] mt-5">
        <h3 className="font-display font-extrabold text-[15px] text-mk-text mb-[10px]">
          Who's coming? 🙋{" "}
          <span className="font-body font-bold text-[11px] text-mk-text-secondary">
            · {players.length}
          </span>
        </h3>
        <div className="space-y-2">
          {players.map((p) => {
            const status = availability[p.id] ?? "maybe";
            return (
              <div
                key={p.id}
                className="bg-mk-surface rounded-mk-md border-[1.5px] border-mk-border-card px-3.5 py-2.5 flex items-center gap-3"
              >
                <Avatar name={p.name} seed={p.id} />
                <div className="flex-1 min-w-0">
                  <div className="font-body font-extrabold text-[14px] text-mk-text">{p.name}</div>
                  {p.isMyPlayer && (
                    <div
                      className="font-body font-bold text-[10px] text-mk-sky uppercase"
                      style={{ letterSpacing: "0.1em" }}
                    >
                      Your player
                    </div>
                  )}
                </div>
                {isCoach && !event.isCancelled ? (
                  <div className="flex rounded-full overflow-hidden border-[1.5px] border-mk-border-card text-xs shrink-0">
                    {(["yes", "maybe", "no"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setAvail(p.id, s)}
                        className={`px-3 py-1.5 min-h-[36px] font-body font-extrabold text-[11px] transition-colors ${
                          status === s ? STATUS_BADGE[s] : "bg-mk-bg text-mk-text-secondary"
                        }`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span
                    className={`font-body font-extrabold text-[10px] px-2.5 py-1 rounded-full ${STATUS_BADGE[status]}`}
                  >
                    {STATUS_BADGE_LABEL[status]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div className="px-[18px] mt-5">
        <div className="flex items-center justify-between mb-[10px]">
          <h3 className="font-display font-extrabold text-[15px] text-mk-text">Notes</h3>
          {isCoach && !editingNotes && (
            <button
              onClick={() => setEditingNotes(true)}
              className="text-[11px] text-mk-sky font-body font-bold min-h-0"
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
              className="w-full px-3 py-2 border border-mk-border-card rounded-mk-md text-sm resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-mk-sky bg-mk-bg font-body"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={saveNotes}
                disabled={savingNotes}
                className="px-3 py-1.5 bg-mk-sky text-white rounded-mk-sm text-xs font-body font-extrabold disabled:opacity-50"
              >
                {savingNotes ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setEditingNotes(false)}
                className="px-3 py-1.5 text-mk-text-secondary text-xs font-body font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-mk-surface rounded-mk-md border-[1.5px] border-mk-border-card px-3.5 py-3">
            <p className="text-sm text-mk-text whitespace-pre-wrap font-body">
              {notes || <span className="text-mk-text-muted italic">No notes</span>}
            </p>
            {event.notesUpdatedAt && event.notesEditorName && (
              <p className="text-[10px] text-mk-text-muted mt-1 font-body">
                Edited{" "}
                {new Date(event.notesUpdatedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                by {event.notesEditorName}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Coach actions */}
      {isCoach && (
        <div className="px-[18px] mt-5 space-y-2">
          {!event.isCancelled && (
            <button
              onClick={() => setShowEdit(true)}
              className="w-full px-4 py-3 border-[1.5px] border-mk-border-card text-mk-text rounded-mk-md text-sm font-body font-extrabold bg-mk-bg"
            >
              Edit event
            </button>
          )}
          {!event.isCancelled && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full px-4 py-3 border-[1.5px] border-mk-maybe-text text-mk-maybe-text rounded-mk-md text-sm font-body font-extrabold disabled:opacity-50 bg-mk-bg"
            >
              {cancelling ? "Cancelling…" : "Cancel event"}
            </button>
          )}
          <button
            onClick={handleDelete}
            className="w-full px-4 py-3 border-[1.5px] border-mk-no-text/40 text-mk-no-text rounded-mk-md text-sm font-body font-extrabold bg-mk-bg"
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
          onSaved={() => {
            setShowEdit(false);
            router.refresh();
          }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
