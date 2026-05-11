export type AvailabilityStatus = "yes" | "no" | "maybe";

const VALID_STATUSES = new Set<string>(["yes", "no", "maybe"]);

export function isValidAvailabilityStatus(s: string): s is AvailabilityStatus {
  return VALID_STATUSES.has(s);
}

export function availabilityLabel(status: AvailabilityStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export interface AvailabilitySummary {
  yes: number;
  no: number;
  maybe: number;
  unanswered: number;
}

export function availabilitySummary(
  statuses: readonly AvailabilityStatus[],
  totalPlayers: number,
): AvailabilitySummary {
  let yes = 0,
    no = 0,
    maybe = 0;
  for (const s of statuses) {
    if (s === "yes") yes++;
    else if (s === "no") no++;
    else maybe++;
  }
  return { yes, no, maybe, unanswered: totalPlayers - statuses.length };
}
