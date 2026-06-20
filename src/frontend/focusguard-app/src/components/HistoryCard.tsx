import type { SessionHistoryItem } from "../types";
import { scoreClass } from "../lib/score";
import { formatDuration } from "../lib/format";
import { FocusChart } from "./FocusChart";

interface HistoryCardProps {
  sessions: SessionHistoryItem[];
  error: boolean;
}

export function HistoryCard({ sessions, error }: HistoryCardProps) {
  const recent = sessions.slice(0, 5);
  const bestFocus = recent.reduce(
    (best, s) => Math.max(best, s.focus_percentage),
    -1,
  );

  return (
    <div className="history-card">
      <div className="history-title">📜 Session History</div>

      {!error && recent.length > 0 && <FocusChart sessions={recent} />}

      <div className="history-list">
        {error ? (
          <div className="history-item">
            <div className="history-value">Failed to load history</div>
          </div>
        ) : recent.length === 0 ? (
          <div className="history-item">
            <div className="history-value">No sessions yet</div>
          </div>
        ) : (
          recent.map((session) => {
            const isBest = session.focus_percentage === bestFocus;
            return (
              <div
                key={session.id}
                className={`history-item${isBest ? " best-session" : ""}`}
              >
                {isBest && <div className="best-badge">🏆 Best Session</div>}
                <div className="history-label">Session #{session.id}</div>
                <div
                  className={`history-value history-score ${scoreClass(
                    session.focus_percentage,
                  )}`}
                >
                  {session.focus_percentage}% focus
                </div>
                <div className="history-label">
                  Focused: {formatDuration(session.focused_time)} | Away:{" "}
                  {formatDuration(session.away_time)} | Alerts:{" "}
                  {session.alerts_count}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
