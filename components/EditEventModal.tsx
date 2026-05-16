"use client";

import { useState } from "react";
import type { FormEvent } from "react";

interface EventData {
  id: string;
  teamId: string;
  kind: "game" | "practice";
  startsAt: string;
  endsAt: string | null;
  location: string;
  opponentName: string | null;
  isHome: boolean | null;
  notes: string | null;
}

interface Props {
  event: EventData;
  onSaved: () => void;
  onClose: () => void;
}

function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditEventModal({ event, onSaved, onClose }: Props) {
  const [kind, setKind] = useState<"practice" | "game">(event.kind);
  const [startsAt, setStartsAt] = useState(toLocalDatetime(event.startsAt));
  const [endsAt, setEndsAt] = useState(event.endsAt ? toLocalDatetime(event.endsAt) : "");
  const [location, setLocation] = useState(event.location);
  const [opponentName, setOpponentName] = useState(event.opponentName ?? "");
  const [isHome, setIsHome] = useState<boolean | null>(event.isHome ?? null);
  const [notes, setNotes] = useState(event.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${event.teamId}/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          location,
          opponentName: kind === "game" ? opponentName || null : null,
          isHome: kind === "game" ? isHome : null,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to save event");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-20" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-mk-bg rounded-t-[40px] z-30 max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-mk-border-card flex items-center justify-between">
          <h2 className="font-display font-extrabold text-[18px] text-mk-text">Edit event</h2>
          <button
            onClick={onClose}
            className="text-mk-text-secondary text-xl leading-none min-h-0"
            style={{ minHeight: "auto" }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 pb-8">
          <div>
            <label className="block text-sm font-body font-bold text-mk-text mb-1">Type</label>
            <div className="flex rounded-full overflow-hidden border-[1.5px] border-mk-border-card">
              {(["practice", "game"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`flex-1 py-2.5 text-sm font-body font-extrabold capitalize ${kind === k ? "bg-mk-sky text-white" : "bg-mk-bg text-mk-text-secondary"}`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-body font-bold text-mk-text mb-1">
              Start time
            </label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-mk-border-card rounded-mk-md text-base bg-mk-bg focus:outline-none focus:ring-2 focus:ring-mk-sky font-body"
            />
          </div>

          <div>
            <label className="block text-sm font-body font-bold text-mk-text mb-1">
              End time <span className="text-mk-text-muted font-normal">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full px-3 py-2.5 border border-mk-border-card rounded-mk-md text-base bg-mk-bg focus:outline-none focus:ring-2 focus:ring-mk-sky font-body"
            />
          </div>

          <div>
            <label className="block text-sm font-body font-bold text-mk-text mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-mk-border-card rounded-mk-md text-base bg-mk-bg focus:outline-none focus:ring-2 focus:ring-mk-sky font-body"
            />
          </div>

          {kind === "game" && (
            <>
              <div>
                <label className="block text-sm font-body font-bold text-mk-text mb-1">
                  Opponent
                </label>
                <input
                  type="text"
                  value={opponentName}
                  onChange={(e) => setOpponentName(e.target.value)}
                  placeholder="Eagles"
                  className="w-full px-3 py-2.5 border border-mk-border-card rounded-mk-md text-base bg-mk-bg focus:outline-none focus:ring-2 focus:ring-mk-sky font-body"
                />
              </div>
              <div>
                <label className="block text-sm font-body font-bold text-mk-text mb-1">
                  Location type
                </label>
                <div className="flex rounded-full overflow-hidden border-[1.5px] border-mk-border-card">
                  {([true, false, null] as const).map((v) => (
                    <button
                      key={String(v)}
                      type="button"
                      onClick={() => setIsHome(v)}
                      className={`flex-1 py-2.5 text-sm font-body font-extrabold ${isHome === v ? "bg-mk-sky text-white" : "bg-mk-bg text-mk-text-secondary"}`}
                    >
                      {v === true ? "Home" : v === false ? "Away" : "TBD"}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-body font-bold text-mk-text mb-1">
              Notes <span className="text-mk-text-muted font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 border border-mk-border-card rounded-mk-md text-sm resize-none bg-mk-bg focus:outline-none focus:ring-2 focus:ring-mk-sky font-body"
            />
          </div>

          {error && <p className="text-mk-no-text text-sm font-body">{error}</p>}

          <button
            type="submit"
            disabled={saving || !startsAt || !location}
            className="w-full py-3 bg-mk-sky text-white rounded-mk-md font-body font-extrabold text-base disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </>
  );
}
