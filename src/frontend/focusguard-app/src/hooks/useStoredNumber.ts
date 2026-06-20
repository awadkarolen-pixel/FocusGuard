import { useCallback, useState } from "react";

/**
 * A number value backed by localStorage, so it survives app restarts.
 * Falls back to `defaultValue` when storage is empty or unavailable.
 */
export function useStoredNumber(
  key: string,
  defaultValue: number,
): readonly [number, (next: number) => void] {
  const [value, setValue] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const set = useCallback(
    (next: number) => {
      setValue(next);
      try {
        localStorage.setItem(key, String(next));
      } catch {
        // Ignore storage failures (e.g. private mode); state still updates.
      }
    },
    [key],
  );

  return [value, set] as const;
}
