export type ScoreClass = "green" | "orange" | "red";

/** Maps a focus percentage to a qualitative score band. */
export function scoreClass(focusPercentage: number): ScoreClass {
  if (focusPercentage > 85) return "green";
  if (focusPercentage >= 60) return "orange";
  return "red";
}

/** Fill/text colors for each score band, matching the dashboard palette. */
export const SCORE_COLORS: Record<ScoreClass, string> = {
  green: "#10b981",
  orange: "#f59e0b",
  red: "#ef4444",
};
