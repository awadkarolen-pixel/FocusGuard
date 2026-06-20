import { type ReactNode } from "react";
import { SCORE_COLORS, scoreClass } from "../lib/score";
import { formatDuration } from "../lib/format";
import { useSessions } from "../hooks/useSessions";
import { BarChart, type BarDatum } from "./BarChart";
import { DonutChart, type DonutSegment } from "./DonutChart";

const FOCUSED_COLOR = "#10b981";
const AWAY_COLOR = "#f97316";

/** Compact minutes → duration for axis/value labels: "45m", "1h30", "2h". */
function compactMinutes(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h${rem}` : `${h}h`;
}

// Charts show the most recent sessions for readability; metrics use them all.
const CHART_LIMIT = 15;

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: ReactNode;
  tone: "blue" | "purple" | "indigo" | "green" | "amber";
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

export function StatisticsPage() {
  const { sessions, error } = useSessions();

  if (sessions === null) {
    return (
      <div className="stats-page">
        <div className="stats-status">Loading statistics…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stats-page">
        <div className="stats-status">Failed to load statistics.</div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="stats-page">
        <div className="stats-status">
          No sessions yet. Complete a session to see your stats.
        </div>
      </div>
    );
  }

  const totalSessions = sessions.length;
  const totalFocusedSeconds = sessions.reduce((sum, s) => sum + s.focused_time, 0);
  const totalAwaySeconds = sessions.reduce((sum, s) => sum + s.away_time, 0);
  const totalStudySeconds = totalFocusedSeconds + totalAwaySeconds;
  const overallFocusPct =
    totalStudySeconds > 0
      ? Math.round((totalFocusedSeconds / totalStudySeconds) * 100)
      : 0;
  const totalAlerts = sessions.reduce((sum, s) => sum + s.alerts_count, 0);

  const timeSegments: DonutSegment[] = [
    {
      label: "Focused",
      value: totalFocusedSeconds,
      display: formatDuration(totalFocusedSeconds),
      color: FOCUSED_COLOR,
    },
    {
      label: "Away",
      value: totalAwaySeconds,
      display: formatDuration(totalAwaySeconds),
      color: AWAY_COLOR,
    },
  ];
  const averageFocus =
    sessions.reduce((sum, s) => sum + s.focus_percentage, 0) / totalSessions;
  const bestFocus = sessions.reduce(
    (best, s) => Math.max(best, s.focus_percentage),
    0,
  );

  // Most recent sessions, ordered oldest → newest so trends read left to right.
  const recent = sessions.slice(0, CHART_LIMIT).reverse();

  const focusData: BarDatum[] = recent.map((s) => ({
    id: s.id,
    label: `#${s.id}`,
    value: s.focus_percentage,
    color: SCORE_COLORS[scoreClass(s.focus_percentage)],
    tooltip: `Session #${s.id} — ${s.focus_percentage}% focus`,
  }));

  const timeData: BarDatum[] = recent.map((s) => {
    const seconds = s.focused_time + s.away_time;
    return {
      id: s.id,
      label: `#${s.id}`,
      value: seconds / 60,
      color: "#3b82f6",
      tooltip: `Session #${s.id} — ${formatDuration(seconds)}`,
    };
  });

  const chartLabel = `last ${recent.length} session${
    recent.length === 1 ? "" : "s"
  }`;

  return (
    <div className="stats-page">
      <div className="stats-metrics">
        <Metric
          icon="⏱️"
          tone="blue"
          label="Total Study Time"
          value={formatDuration(totalStudySeconds)}
        />
        <Metric
          icon="✅"
          tone="purple"
          label="Sessions Completed"
          value={totalSessions}
        />
        <Metric
          icon="🎯"
          tone="indigo"
          label="Average Focus"
          value={`${averageFocus.toFixed(1)}%`}
        />
        <Metric
          icon="🏆"
          tone="green"
          label="Best Focus"
          value={`${bestFocus}%`}
        />
        <Metric icon="🔔" tone="amber" label="Total Alerts" value={totalAlerts} />
      </div>

      <div className="stats-charts">
        <div className="chart">
          <div className="chart-caption">Time Distribution — all sessions</div>
          <DonutChart
            segments={timeSegments}
            centerValue={`${overallFocusPct}%`}
            centerLabel="Focused"
            ariaLabel="Overall focused versus away time"
          />
        </div>

        <div className="chart">
          <div className="chart-caption">Focus % — {chartLabel}</div>
          <BarChart
            data={focusData}
            max={100}
            ariaLabel="Focus percentage per session"
          />
        </div>

        <div className="chart">
          <div className="chart-caption">Study time — {chartLabel}</div>
          <BarChart
            data={timeData}
            ariaLabel="Study time per session"
            formatTick={compactMinutes}
            showValues
            formatValue={compactMinutes}
          />
        </div>
      </div>
    </div>
  );
}
