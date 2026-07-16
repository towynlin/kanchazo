export type GameOutcome = "win" | "loss" | "tie";

export function gameOutcome(
  ourScore: number | null,
  opponentScore: number | null,
): GameOutcome | null {
  if (ourScore === null || opponentScore === null) return null;
  if (ourScore > opponentScore) return "win";
  if (ourScore < opponentScore) return "loss";
  return "tie";
}

export function formatGameScore(ourScore: number | null, opponentScore: number | null): string {
  if (ourScore === null || opponentScore === null) return "";
  const outcome = gameOutcome(ourScore, opponentScore);
  const prefix = outcome === "win" ? "W" : outcome === "loss" ? "L" : "T";
  return `${prefix} ${ourScore}–${opponentScore}`;
}
