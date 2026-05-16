"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CreateEventModal from "@/components/CreateEventModal";
import GrassStripe from "@/components/GrassStripe";

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

const STATUS_BTN: Record<"yes" | "no" | "maybe", string> = {
  yes: "bg-mk-yes-bg text-mk-yes-text",
  maybe: "bg-mk-maybe-bg text-mk-maybe-text",
  no: "bg-mk-no-bg text-mk-no-text",
};

export default function ScheduleClient({
  teamId,
  timeZone,
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
        setAvailability((a) => ({
          ...a,
          [eventId]: { ...a[eventId], [playerId]: prev ?? "maybe" },
        }));
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

  const now = Date.now();
  const upcoming = events
    .filter((e) => new Date(e.startsAt).getTime() >= now && e.status === "scheduled")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const nextGame = upcoming.find((e) => e.kind === "game");
  const confirmedCount = nextGame
    ? Object.values(availability[nextGame.id] ?? {}).filter((s) => s === "yes").length
    : 0;
  const upcomingCount = upcoming.length;

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
          <div className="text-5xl mb-4">⚽</div>
          <h2 className="font-display font-extrabold text-[22px] text-mk-text mb-2">
            No upcoming events
          </h2>
          {isCoach && (
            <p className="text-mk-text-secondary text-sm font-body">
              Tap + to add a practice or game.
            </p>
          )}
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
        {nextGame && (
          <div className="px-[18px] pt-4">
            <NextGameCard event={nextGame} timeZone={timeZone} />
            <StatPills nextGame={nextGame} confirmed={confirmedCount} upcoming={upcomingCount} />
          </div>
        )}

        {!pastLoaded && (
          <div className="px-[18px] py-3 text-center">
            <button
              onClick={loadPastEvents}
              disabled={loadingPast}
              className="text-sm text-mk-sky font-body font-bold disabled:opacity-50 min-h-0"
              style={{ minHeight: 0 }}
            >
              {loadingPast ? "Loading…" : "↑ Show past events"}
            </button>
          </div>
        )}

        {Object.entries(byDate).map(([date, dayEvents]) => (
          <div key={date}>
            <div className="sticky top-0 bg-mk-bg px-[18px] py-2 border-b border-mk-border-card z-10">
              <span className="micro-label">{date}</span>
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

function NextGameCard({ event, timeZone }: { event: SerializedEvent; timeZone: string }) {
  const date = new Date(event.startsAt);
  const day = date.toLocaleDateString("en-US", { day: "numeric", timeZone }).toUpperCase();
  const weekdayMonth = date
    .toLocaleDateString("en-US", { weekday: "short", month: "short", timeZone })
    .toUpperCase();
  const time = date
    .toLocaleTimeString("en-US", { hour: "numeric", timeZone })
    .replace(/\s/g, "")
    .toUpperCase();
  const label = event.opponentName
    ? event.isHome === false
      ? "NEXT GAME @"
      : "NEXT GAME VS"
    : "NEXT GAME";

  return (
    <Link
      href={`/schedule/${event.id}`}
      className="block min-h-0 rounded-mk-lg border-[1.5px] border-mk-border-card shadow-mk-game overflow-hidden bg-mk-bg"
      style={{ minHeight: 0 }}
    >
      <div className="bg-mk-surface-blue px-5 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div
            className="font-body font-bold text-[10px] text-mk-sky uppercase mb-1"
            style={{ letterSpacing: "0.14em" }}
          >
            <span className="mr-1">⚽</span>
            {label}
          </div>
          <div className="font-display font-extrabold text-[20px] text-mk-text leading-tight truncate">
            {event.opponentName ?? "Game"}
          </div>
        </div>
        <div className="text-right">
          <div className="font-display font-extrabold text-[30px] text-mk-sky leading-none">
            {day}
          </div>
          <div
            className="font-body font-bold text-[10px] text-mk-text-secondary mt-1"
            style={{ letterSpacing: "0.1em" }}
          >
            {weekdayMonth}
          </div>
          <div
            className="font-body font-bold text-[10px] text-mk-text-secondary"
            style={{ letterSpacing: "0.1em" }}
          >
            {time}
          </div>
        </div>
      </div>
      <GrassStripe />
      <div className="bg-mk-bg px-5 py-3 flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block w-[6px] h-[6px] rounded-full bg-mk-grass shrink-0"
        />
        <span className="font-body font-bold text-[11px] text-mk-text-secondary truncate">
          {event.location}
        </span>
      </div>
    </Link>
  );
}

function StatPills({
  nextGame,
  confirmed,
  upcoming,
}: {
  nextGame: SerializedEvent;
  confirmed: number;
  upcoming: number;
}) {
  const date = new Date(nextGame.startsAt);
  const days = Math.max(0, Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const pills = [
    { value: upcoming.toString(), label: "Upcoming" },
    { value: confirmed.toString(), label: "Confirmed" },
    { value: `${days}`, label: days === 1 ? "Day left" : "Days left" },
  ];
  return (
    <div className="grid grid-cols-3 gap-[10px] mt-3">
      {pills.map((p) => (
        <div
          key={p.label}
          className="bg-mk-surface rounded-mk-md border-[1.5px] border-mk-border py-3 text-center"
        >
          <div className="font-display font-extrabold text-[22px] text-mk-sky leading-none">
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
  );
}

function CoachFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Create event"
      className="fixed bottom-24 right-5 w-14 h-14 bg-mk-sky text-white rounded-full shadow-mk-game text-2xl flex items-center justify-center z-10"
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
    <div className={`px-[18px] py-3 ${isCancelled ? "opacity-60" : ""}`}>
      <Link
        href={`/schedule/${event.id}`}
        className="block min-h-0 rounded-mk-md bg-mk-surface border-[1.5px] border-mk-border-card p-3"
        style={{ minHeight: 0 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`font-display font-extrabold text-[16px] text-mk-text ${isCancelled ? "line-through" : ""}`}
              >
                {event.title}
              </span>
              {isCancelled && (
                <span className="font-body font-extrabold text-[10px] bg-mk-no-bg text-mk-no-text px-2 py-0.5 rounded-full">
                  Cancelled
                </span>
              )}
              {event.kind === "game" && !isCancelled && (
                <span
                  className="font-body font-bold text-[9px] text-mk-grass uppercase"
                  style={{ letterSpacing: "0.12em" }}
                >
                  Game
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                aria-hidden
                className="inline-block w-[6px] h-[6px] rounded-full bg-mk-grass shrink-0"
              />
              <span className="font-body font-bold text-[11px] text-mk-text-secondary truncate">
                {event.timeLabel} · {event.location}
              </span>
            </div>
          </div>
        </div>
      </Link>

      {myPlayers.length > 0 && !isCancelled && (
        <div className="mt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
          {myPlayers.map((player) => {
            const current = availability[player.id] ?? "maybe";
            return (
              <div key={player.id} className="flex items-center gap-2">
                {myPlayers.length > 1 && (
                  <span className="font-body font-bold text-[11px] text-mk-text-secondary w-16 truncate">
                    {player.name}
                  </span>
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
    { label: "In!", value: "yes" },
    { label: "Maybe", value: "maybe" },
    { label: "Can't", value: "no" },
  ];

  return (
    <div className="flex rounded-full overflow-hidden border-[1.5px] border-mk-border-card text-xs bg-mk-bg">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          disabled={disabled}
          className={`px-3 py-1.5 min-h-[36px] font-body font-extrabold text-[11px] transition-colors ${
            value === opt.value ? STATUS_BTN[opt.value] : "bg-mk-bg text-mk-text-secondary"
          } ${disabled ? "opacity-50" : ""}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
