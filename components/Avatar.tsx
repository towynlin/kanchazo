const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #0369a1, #075985)",
  "linear-gradient(135deg, #22c55e, #15803d)",
  "linear-gradient(135deg, #38bdf8, #0369a1)",
  "linear-gradient(135deg, #f59e0b, #d97706)",
  "linear-gradient(135deg, #8b5cf6, #6d28d9)",
  "linear-gradient(135deg, #ec4899, #be185d)",
  "linear-gradient(135deg, #14b8a6, #0f766e)",
  "linear-gradient(135deg, #f97316, #c2410c)",
];

function colorIndex(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % AVATAR_GRADIENTS.length;
}

interface Props {
  name: string;
  seed?: string;
  size?: number;
  variant?: "player" | "coach";
}

export default function Avatar({ name, seed, size = 38, variant = "player" }: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const isCoach = variant === "coach";
  const background = isCoach ? "var(--color-mk-sky)" : AVATAR_GRADIENTS[colorIndex(seed ?? name)];
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: isCoach ? "9999px" : "12px",
        background,
      }}
      className="inline-flex items-center justify-center text-white font-body font-extrabold text-[13px] shrink-0"
    >
      {initial}
    </span>
  );
}
