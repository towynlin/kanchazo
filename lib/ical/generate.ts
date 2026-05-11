import type { Event, Team } from "@/lib/db/schema";
import { formatEventTitle } from "@/lib/domain/events";

function icalDate(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeIcal(s: string): string {
  return s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

export function generateIcal(events: Event[], teamMap: Map<string, Team>, calName: string): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Kanchazo//Team Schedule//EN`,
    `X-WR-CALNAME:${escapeIcal(calName)}`,
    "X-WR-TIMEZONE:UTC",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    const team = teamMap.get(event.teamId);
    const title = formatEventTitle(event);
    const fullTitle = team ? `${team.name}: ${title}` : title;
    const cancelled = event.status === "cancelled";

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.id}@kanchazo`);
    lines.push(`DTSTAMP:${icalDate(new Date())}`);
    lines.push(`DTSTART:${icalDate(event.startsAt)}`);
    if (event.endsAt) {
      lines.push(`DTEND:${icalDate(event.endsAt)}`);
    }
    lines.push(`SUMMARY:${escapeIcal(cancelled ? `[Cancelled] ${fullTitle}` : fullTitle)}`);
    lines.push(`LOCATION:${escapeIcal(event.location)}`);
    if (event.notes) {
      lines.push(`DESCRIPTION:${escapeIcal(event.notes)}`);
    }
    if (cancelled) {
      lines.push("STATUS:CANCELLED");
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
