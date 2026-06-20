import type { ReactNode } from "react";
import type { SessionSummary } from "../types";
import { formatDuration } from "../lib/format";

type Tone = "blue" | "purple" | "indigo" | "green" | "amber" | "red";

interface SummaryCardProps {
  summary: SessionSummary;
  onRestart: () => void;
  onViewStatistics: () => void;
  onViewHistory: () => void;
}

function Metric({
  tone,
  icon,
  label,
  value,
}: {
  tone: Tone;
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

export function SummaryCard({
  summary,
  onRestart,
  onViewStatistics,
  onViewHistory,
}: SummaryCardProps) {
  return (
    <div className="summary-dashboard">
      <div className="summary-banner">✅ SESSION COMPLETED</div>

      <div className="summary-metrics">
        <Metric
          tone="purple"
          icon="🎯"
          label="Focus Percentage"
          value={`${summary.focus_percentage}%`}
        />
        <Metric
          tone="green"
          icon="⏱️"
          label="Focused Time"
          value={formatDuration(summary.focused_time)}
        />
        <Metric
          tone="red"
          icon="💤"
          label="Away Time"
          value={formatDuration(summary.away_time)}
        />
        <Metric
          tone="amber"
          icon="🔔"
          label="Alerts"
          value={summary.alerts_count}
        />
      </div>

      <div className="summary-actions">
        <button className="summary-primary-btn" onClick={onRestart}>
          ▶ Start New Session
        </button>
        <button className="summary-secondary-btn" onClick={onViewStatistics}>
          📊 View Statistics
        </button>
        <button className="summary-secondary-btn" onClick={onViewHistory}>
          📜 View History
        </button>
      </div>
    </div>
  );
}
