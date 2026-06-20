import { useEffect, useState, type ReactNode } from "react";
import type { SessionHistoryItem } from "../types";
import { scoreClass } from "../lib/score";
import { formatDuration } from "../lib/format";
import { useSessions } from "../hooks/useSessions";

const PAGE_SIZE = 6;

type Filter = "all" | "today" | "week" | "month";
type Sort = "newest" | "best" | "alerts";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All sessions" },
];

/** Local-time epoch (ms) for the start of the current day/week/month. */
function filterThreshold(filter: Filter): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (filter === "today") return d.getTime();
  if (filter === "week") {
    d.setDate(d.getDate() - d.getDay()); // back to Sunday
    return d.getTime();
  }
  if (filter === "month") {
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }
  return 0; // "all"
}

function Metric({
  tone,
  icon,
  label,
  value,
}: {
  tone: "blue" | "indigo" | "green" | "amber";
  icon: string;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className={`metric-card ${tone}`}>
      <div className="metric-icon">{icon}</div>
      <div className="metric-text">
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value}</div>
      </div>
    </div>
  );
}

function formatSessionDate(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  const date = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date}, ${time}`;
}

function SessionTile({
  session,
  isBest,
}: {
  session: SessionHistoryItem;
  isBest: boolean;
}) {
  return (
    <div className={`history-tile${isBest ? " best" : ""}`}>
      <div className="history-tile-head">
        <span className="history-tile-id">Session #{session.id}</span>
        {isBest && <span className="history-tile-badge">🏆 Best</span>}
      </div>
      <div className="history-tile-date">
        {formatSessionDate(session.start_time)}
      </div>
      <div className={`history-tile-pct ${scoreClass(session.focus_percentage)}`}>
        {session.focus_percentage}%
      </div>
      <div className="history-tile-stats">
        <span>⏱️ {formatDuration(session.focused_time)}</span>
        <span>💤 {formatDuration(session.away_time)}</span>
        <span>🔔 {session.alerts_count}</span>
      </div>
    </div>
  );
}

export function HistoryPage() {
  const { sessions, error } = useSessions();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Reset pagination whenever the filter or sort changes.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [filter, sort]);

  if (sessions === null) {
    return (
      <div className="stats-page">
        <div className="stats-status">Loading history…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stats-page">
        <div className="stats-status">Failed to load history.</div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="stats-page">
        <div className="stats-status">
          No sessions yet. Complete a session to build your history.
        </div>
      </div>
    );
  }

  // Filter first, then derive the summary cards from the filtered set so they
  // reflect the active filter (Today / week / month / all).
  const threshold = filterThreshold(filter);
  const filtered = sessions.filter((s) => s.start_time * 1000 >= threshold);

  const sessionCount = filtered.length;
  const averageFocus =
    sessionCount > 0
      ? filtered.reduce((sum, s) => sum + s.focus_percentage, 0) / sessionCount
      : 0;
  const bestFocus = filtered.reduce(
    (best, s) => Math.max(best, s.focus_percentage),
    0,
  );
  const totalAlerts = filtered.reduce((sum, s) => sum + s.alerts_count, 0);

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "best") return b.focus_percentage - a.focus_percentage || b.id - a.id;
    if (sort === "alerts") return b.alerts_count - a.alerts_count || b.id - a.id;
    return b.id - a.id; // newest first
  });

  const shown = sorted.slice(0, visible);

  return (
    <div className="stats-page">
      <div className="history-metrics">
        <Metric tone="blue" icon="📚" label="Sessions" value={sessionCount} />
        <Metric
          tone="indigo"
          icon="🎯"
          label="Average Focus"
          value={`${averageFocus.toFixed(1)}%`}
        />
        <Metric tone="green" icon="🏆" label="Best Focus" value={`${bestFocus}%`} />
        <Metric tone="amber" icon="🔔" label="Alerts" value={totalAlerts} />
      </div>

      <div className="history-toolbar">
        <div className="filter-group">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`chip ${filter === f.value ? "active" : ""}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="sort-group">
          <label htmlFor="historySort">Sort</label>
          <select
            id="historySort"
            className="sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
          >
            <option value="newest">Newest first</option>
            <option value="best">Best focus</option>
            <option value="alerts">Most alerts</option>
          </select>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="history-empty">No sessions in this period.</div>
      ) : (
        <>
          <div className="history-count">
            Showing {shown.length} of {sorted.length} session
            {sorted.length === 1 ? "" : "s"}
          </div>

          <div className="history-grid">
            {shown.map((s) => (
              <SessionTile
                key={s.id}
                session={s}
                isBest={s.focus_percentage === bestFocus}
              />
            ))}
          </div>

          {visible < sorted.length && (
            <div className="history-more">
              <button
                className="show-more-btn"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
              >
                Show more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
