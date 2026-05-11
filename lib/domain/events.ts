interface EventStatus {
  status: "scheduled" | "cancelled";
}

interface EventTiming {
  startsAt: Date;
}

interface EventTitle {
  kind: "game" | "practice";
  opponentName?: string | null;
  isHome?: boolean | null;
}

export function isCancelledEvent(event: EventStatus): boolean {
  return event.status === "cancelled";
}

export function isPastEvent(event: EventTiming): boolean {
  return event.startsAt < new Date();
}

export function formatEventTitle(event: EventTitle): string {
  if (event.kind === "practice") return "Practice";
  if (!event.opponentName) return "Game";
  return event.isHome ? `vs ${event.opponentName} (Home)` : `@ ${event.opponentName} (Away)`;
}

export function formatEventTimeRange(
  startsAt: Date,
  endsAt: Date | null,
  timeZone: string,
): string {
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
    });
  if (!endsAt) return fmt(startsAt);
  return `${fmt(startsAt)} – ${fmt(endsAt)}`;
}

export function formatEventDate(startsAt: Date, timeZone: string): string {
  return startsAt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  });
}
