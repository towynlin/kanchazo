"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AvailabilitySummary } from "@/lib/domain/availability";
import { formatGameScore } from "@/lib/domain/game-reports";
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

interface GameReportData {
  ourScore: number | null;
  opponentScore: number | null;
  coachNotes: string | null;
  version: number;
  updatedAt: string | null;
  updatedByName: string | null;
}

interface Props {
  event: EventData;
  isCoach: boolean;
  gameReport: GameReportData | null;
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
  gameReport,
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

  // Coach-only game report (score + private notes)
  const [report, setReport] = useState(gameReport);
  const [editingReport, setEditingReport] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [reportConflict, setReportConflict] = useState(false);
  const [draftOurScore, setDraftOurScore] = useState("");
  const [draftOppScore, setDraftOppScore] = useState("");
  const [draftCoachNotes, setDraftCoachNotes] = useState("");

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

  function seedReportDraft(from: GameReportData | null) {
    setDraftOurScore(from?.ourScore != null ? String(from.ourScore) : "");
    setDraftOppScore(from?.opponentScore != null ? String(from.opponentScore) : "");
    setDraftCoachNotes(from?.coachNotes ?? "");
  }

  function startEditReport() {
    seedReportDraft(report);
    setReportConflict(false);
    setEditingReport(true);
  }

  async function saveReport() {
    setSavingReport(true);
    try {
      const res = await fetch(`/api/teams/${event.teamId}/events/${event.id}/game-report`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ourScore: draftOurScore === "" ? null : Number(draftOurScore),
          opponentScore: draftOppScore === "" ? null : Number(draftOppScore),
          coachNotes: draftCoachNotes.trim() === "" ? null : draftCoachNotes,
          baseVersion: report?.version ?? 0,
        }),
      });
      if (res.status === 409) {
        // Another coach saved first: adopt their version number so the next
        // save succeeds, keep this coach's draft, and let them reconcile.
        const { current } = await res.json();
        setReport(
          current
            ? {
                ourScore: current.ourScore,
                opponentScore: current.opponentScore,
                coachNotes: current.coachNotes,
                version: current.version,
                updatedAt: current.updatedAt,
                updatedByName: null,
              }
            : null,
        );
        setReportConflict(true);
        return;
      }
      if (!res.ok) return;
      const saved = await res.json();
      setReport({
        ourScore: saved.ourScore,
        opponentScore: saved.opponentScore,
        coachNotes: saved.coachNotes,
        version: saved.version,
        updatedAt: saved.updatedAt,
        updatedByName: "you",
      });
      setReportConflict(false);
      setEditingReport(false);
    } finally {
      setSavingReport(false);
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

      {/* Coach's corner: final score + coach-only notes (never rendered for parents) */}
      {isCoach && event.kind === "game" && (
        <div className="px-[18px] mt-5">
          <div className="flex items-center justify-between mb-[10px]">
            <h3 className="font-display font-extrabold text-[15px] text-mk-text">
              Coach&apos;s corner 🔒
            </h3>
            {!editingReport && (
              <button
                onClick={startEditReport}
                className="text-[11px] text-mk-sky font-body font-bold min-h-0"
                style={{ minHeight: "auto" }}
              >
                Edit
              </button>
            )}
          </div>
          <p className="font-body font-bold text-[10px] text-mk-text-muted mb-2">
            Only coaches on this team can see this.
          </p>
          {reportConflict && (
            <div className="bg-mk-maybe-bg border-[1.5px] border-mk-maybe-text/40 rounded-mk-md px-3.5 py-2.5 mb-2">
              <p className="font-body font-bold text-[11px] text-mk-maybe-text">
                Another coach saved changes while you were editing. Their version:{" "}
                {report && report.ourScore != null && report.opponentScore != null
                  ? formatGameScore(report.ourScore, report.opponentScore)
                  : "no score"}
                {report?.coachNotes ? ` — “${report.coachNotes}”` : ""}
              </p>
              <div className="flex gap-2 mt-1.5">
                <button
                  onClick={() => {
                    seedReportDraft(report);
                    setReportConflict(false);
                  }}
                  className="text-[11px] text-mk-sky font-body font-extrabold min-h-0"
                  style={{ minHeight: "auto" }}
                >
                  Use their version
                </button>
                <button
                  onClick={() => setReportConflict(false)}
                  className="text-[11px] text-mk-text-secondary font-body font-bold min-h-0"
                  style={{ minHeight: "auto" }}
                >
                  Keep mine — Save will overwrite
                </button>
              </div>
            </div>
          )}
          {editingReport ? (
            <div className="bg-mk-surface rounded-mk-md border-[1.5px] border-mk-border-card px-3.5 py-3">
              <div className="flex items-end gap-3">
                <label className="flex-1">
                  <span className="font-body font-bold text-[10px] text-mk-text-muted uppercase">
                    Us
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={draftOurScore}
                    onChange={(e) => setDraftOurScore(e.target.value)}
                    className="w-full px-3 py-2 border border-mk-border-card rounded-mk-md text-sm focus:outline-none focus:ring-2 focus:ring-mk-sky bg-mk-bg font-body"
                  />
                </label>
                <span className="font-display font-extrabold text-[18px] text-mk-text-muted pb-2">
                  –
                </span>
                <label className="flex-1">
                  <span className="font-body font-bold text-[10px] text-mk-text-muted uppercase">
                    {event.opponentName ?? "Them"}
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={draftOppScore}
                    onChange={(e) => setDraftOppScore(e.target.value)}
                    className="w-full px-3 py-2 border border-mk-border-card rounded-mk-md text-sm focus:outline-none focus:ring-2 focus:ring-mk-sky bg-mk-bg font-body"
                  />
                </label>
              </div>
              <textarea
                value={draftCoachNotes}
                onChange={(e) => setDraftCoachNotes(e.target.value)}
                placeholder="Coach notes — what worked, what to practice…"
                className="w-full mt-2 px-3 py-2 border border-mk-border-card rounded-mk-md text-sm resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-mk-sky bg-mk-bg font-body"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={saveReport}
                  disabled={savingReport}
                  className="px-3 py-1.5 bg-mk-sky text-white rounded-mk-sm text-xs font-body font-extrabold disabled:opacity-50"
                >
                  {savingReport ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditingReport(false);
                    setReportConflict(false);
                  }}
                  className="px-3 py-1.5 text-mk-text-secondary text-xs font-body font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-mk-surface rounded-mk-md border-[1.5px] border-mk-border-card px-3.5 py-3">
              {report && report.ourScore != null && report.opponentScore != null ? (
                <p className="font-display font-extrabold text-[18px] text-mk-text">
                  {formatGameScore(report.ourScore, report.opponentScore)}
                </p>
              ) : (
                <p className="text-sm text-mk-text-muted italic font-body">No score yet</p>
              )}
              <p className="text-sm text-mk-text whitespace-pre-wrap font-body mt-1">
                {report?.coachNotes || (
                  <span className="text-mk-text-muted italic">No coach notes</span>
                )}
              </p>
              {report?.updatedAt && report.updatedByName && (
                <p className="text-[10px] text-mk-text-muted mt-1 font-body">
                  Edited{" "}
                  {new Date(report.updatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  by {report.updatedByName}
                </p>
              )}
            </div>
          )}
        </div>
      )}

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
