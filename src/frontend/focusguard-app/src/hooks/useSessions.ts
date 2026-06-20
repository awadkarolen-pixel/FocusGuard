import { useEffect, useState } from "react";
import { API_BASE } from "../constants";
import type { SessionHistoryItem } from "../types";

export interface SessionsState {
  /** null while loading; array once a response (or failure) is settled. */
  sessions: SessionHistoryItem[] | null;
  error: boolean;
}

/** Loads all sessions from GET /sessions once on mount. */
export function useSessions(): SessionsState {
  const [sessions, setSessions] = useState<SessionHistoryItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${API_BASE}/sessions`);
        const data = (await response.json()) as SessionHistoryItem[];
        if (!cancelled) {
          setSessions(data);
          setError(false);
        }
      } catch {
        if (!cancelled) {
          setSessions([]);
          setError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { sessions, error };
}
