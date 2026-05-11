"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CreateEventModal from "@/components/CreateEventModal";

interface SerializedEvent {
  id: string;
  kind: "game" | "practice";
  status: "scheduled" | "cancelled";
  location: string;
  opponentName: string | null;
  isHome: boolean | null;
  notes: string | null;
  startsAt: string;
  endsAt: string | null;
  title: string;
  dateLabel: string;
  timeLabel: string;
}

interface Props {
  teamId: string;
  timeZone: string;
  isCoach: boolean;
  events: SerializedEvent[];
  myPlayers: { id: string; name: string }[];
  initialAvailability: Record<string, Record<string, "yes" | "no" | "maybe">>;
}

const STATUS_COLORS: Record<string, string> = {
  yes: "bg-green-100 text-green-700 border-green-300",
  no: "bg-red-100 text-red-700 border-red-300",
  maybe: "bg-yellow-100 text-yellow-700 border-yellow-300",
};

export default function ScheduleClient({
  teamId,
  isCoach,
  events: initialEvents,
  myPlayers,
  initialAvailability,
}: Props) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [availability, setAvailability] = useState(initialAvailability);
  const [optimisticPending, setOptimisticPending] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [loadingPast, setLoadingPast] = useState(false);
  const [pastLoaded, setPastLoaded] = useState(false);

  const setAvail = useCallback(
    async (eventId: string, playerId: string, status: "yes" | "no" | "maybe") => {
      const key = `${eventId}:${playerId}`;
      const prev = availability[eventId]?.[playerId];

      // Optimistic update
      setAvailability((a) => ({
        ...a,
        [eventId]: { ...a[eventId], [playerId]: status },
      }));
      setOptimisticPending((s) => new Set(s).add(key));

      try {
        const res = await fetch(`/api/teams/${teamId}/events/${eventId}/availability`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId, status }),
        });
        if (!res.ok) throw new Error("Failed");
      } catch {
        // Rollback
        setAvailability((a) => ({
          ...a,
          [eventId]: { ...a[eventId], [playerId]: prev ?? "maybe" },
        }));
        // TODO: show toast
      } finally {
        setOptimisticPending((s) => {
          const next = new Set(s);
          next.delete(key);
          return next;
        });
      }
    },
    [availability, teamId],
  );

  async function loadPastEvents() {
    if (pastLoaded || loadingPast) return;
    setLoadingPast(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/events/serialized?past=true`);
      if (!res.ok) return;
      const all: SerializedEvent[] = await res.json();
      const currentIds = new Set(events.map((e) => e.id));
      const past = all.filter((e) => !currentIds.has(e.id));
      setEvents((prev) => [...past, ...prev]);
      setPastLoaded(true);
    } finally {
      setLoadingPast(false);
    }
  }

  // Group events by date
  const byDate: Record<string, SerializedEvent[]> = {};
  for (const event of events) {
    if (!byDate[event.dateLabel]) byDate[event.dateLabel] = [];
    byDate[event.dateLabel].push(event);
  }

  if (events.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="text-5xl mb-4">📅</div>
          <h2 className="text-xl font-semibold mb-2">No upcoming events</h2>
          {isCoach && <p className="text-gray-500 text-sm">Tap + to add a practice or game.</p>}
        </div>
        {isCoach && <CoachFab onClick={() => setShowCreate(true)} />}
        {showCreate && (
          <CreateEventModal
            teamId={teamId}
            onCreated={() => {
              setShowCreate(false);
              router.refresh();
            }}
            onClose={() => setShowCreate(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="pb-4">
        {!pastLoaded && (
          <div className="px-4 py-2 text-center border-b border-gray-100">
            <button
              onClick={loadPastEvents}
              disabled={loadingPast}
              className="text-sm text-blue-600 font-medium disabled:opacity-50"
            >
              {loadingPast ? "Loading…" : "↑ Show past events"}
            </button>
          </div>
        )}
        {Object.entries(byDate).map(([date, dayEvents]) => (
          <div key={date}>
            {/* Sticky date header */}
            <div className="sticky top-0 bg-gray-50 px-4 py-2 border-b border-gray-200 z-10">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {date}
              </span>
            </div>

            {dayEvents.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                myPlayers={myPlayers}
                availability={availability[event.id] ?? {}}
                onSetAvail={(playerId, status) => setAvail(event.id, playerId, status)}
                pending={myPlayers.some((p) => optimisticPending.has(`${event.id}:${p.id}`))}
              />
            ))}
          </div>
        ))}
      </div>
      {isCoach && <CoachFab onClick={() => setShowCreate(true)} />}
      {showCreate && (
        <CreateEventModal
          teamId={teamId}
          onCreated={() => {
            setShowCreate(false);
            router.refresh();
          }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </>
  );
}

function CoachFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Create event"
      className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg text-2xl flex items-center justify-center z-10"
    >
      +
    </button>
  );
}

function EventRow({
  event,
  myPlayers,
  availability,
  onSetAvail,
  pending,
}: {
  event: SerializedEvent;
  myPlayers: { id: string; name: string }[];
  availability: Record<string, "yes" | "no" | "maybe">;
  onSetAvail: (playerId: string, status: "yes" | "no" | "maybe") => void;
  pending: boolean;
}) {
  const isCancelled = event.status === "cancelled";

  return (
    <div className={`border-b border-gray-100 px-4 py-3 ${isCancelled ? "opacity-60" : ""}`}>
      <Link href={`/schedule/${event.id}`} className="block min-h-0" style={{ minHeight: "auto" }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-medium ${isCancelled ? "line-through" : ""}`}>
                {event.title}
              </span>
              {isCancelled && (
                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                  Cancelled
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500 mt-0.5">
              {event.timeLabel} · {event.location}
            </div>
          </div>
        </div>
      </Link>

      {/* Availability controls for my players */}
      {myPlayers.length > 0 && !isCancelled && (
        <div className="mt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
          {myPlayers.map((player) => {
            const current = availability[player.id] ?? "maybe";
            return (
              <div key={player.id} className="flex items-center gap-2">
                {myPlayers.length > 1 && (
                  <span className="text-xs text-gray-500 w-16 truncate">{player.name}</span>
                )}
                <AvailabilityControl
                  value={current}
                  onChange={(s) => onSetAvail(player.id, s)}
                  disabled={pending}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AvailabilityControl({
  value,
  onChange,
  disabled,
}: {
  value: "yes" | "no" | "maybe";
  onChange: (s: "yes" | "no" | "maybe") => void;
  disabled: boolean;
}) {
  const options: Array<{ label: string; value: "yes" | "no" | "maybe" }> = [
    { label: "Yes", value: "yes" },
    { label: "Maybe", value: "maybe" },
    { label: "No", value: "no" },
  ];

  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          disabled={disabled}
          className={`px-3 py-1.5 min-h-[36px] font-medium transition-colors
            ${value === opt.value ? STATUS_COLORS[opt.value] + " border" : "bg-white text-gray-600"}
            ${disabled ? "opacity-50" : ""}
          `}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
