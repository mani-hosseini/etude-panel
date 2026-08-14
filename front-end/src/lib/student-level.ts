export const STUDENT_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export type StudentLevel = (typeof STUDENT_LEVELS)[number];

type LevelStyle = {
  color: string;
  glow: string;
  fg: string;
};

/** Colors for student levels 1–10 (badge + sidebar glow). */
export const STUDENT_LEVEL_STYLE: Record<StudentLevel, LevelStyle> = {
  1: { color: "#b91c1c", glow: "rgba(185, 28, 28, 0.55)", fg: "#ffffff" },
  2: { color: "#f87171", glow: "rgba(248, 113, 113, 0.5)", fg: "#7f1d1d" },
  3: { color: "#ca8a04", glow: "rgba(202, 138, 4, 0.55)", fg: "#ffffff" },
  4: { color: "#fde047", glow: "rgba(253, 224, 71, 0.5)", fg: "#713f12" },
  5: { color: "#86efac", glow: "rgba(134, 239, 172, 0.5)", fg: "#14532d" },
  6: { color: "#15803d", glow: "rgba(21, 128, 61, 0.55)", fg: "#ffffff" },
  7: { color: "#93c5fd", glow: "rgba(147, 197, 253, 0.5)", fg: "#1e3a8a" },
  8: { color: "#1d4ed8", glow: "rgba(29, 78, 216, 0.55)", fg: "#ffffff" },
  9: { color: "#0b1a3d", glow: "rgba(96, 140, 255, 0.55)", fg: "#ffffff" },
  10: { color: "#7c3aed", glow: "rgba(124, 58, 237, 0.55)", fg: "#ffffff" },
};

export function parseStudentLevel(
  value: string | number | null | undefined,
): StudentLevel {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (n >= 1 && n <= 10) return n as StudentLevel;
  return 1;
}

/** Tight colored edge light — looks like a glowing border, not a back-shadow. */
export function studentLevelEdgeGlow(color: string): string {
  return `0 0 0 2px ${color}, 0 0 10px 1px ${color}`;
}
