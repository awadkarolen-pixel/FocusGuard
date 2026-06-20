/**
 * Formats a whole-minute duration for display:
 *   < 60 min      -> "30 min"
 *   exact hours   -> "1h", "2h"
 *   hours + mins  -> "1h 30m", "2h 30m"
 */
export function formatMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

/**
 * Formats a duration given in seconds. Sub-minute values keep second precision
 * (e.g. "42s"); from one minute up it follows {@link formatMinutes}.
 */
export function formatDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.round(seconds));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  return formatMinutes(totalSeconds / 60);
}

/**
 * Formats a live countdown as a clock: "MM:SS", or "H:MM:SS" once it reaches
 * an hour (so long custom sessions don't show values like "120:00").
 */
export function formatRemaining(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
