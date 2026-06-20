import type { ReactNode } from "react";
import type { FocusUpdate } from "../types";
import { formatDuration, formatRemaining } from "../lib/format";
import { DailyGoal } from "./DailyGoal";

type Tone = "blue" | "purple" | "indigo" | "green" | "amber" | "red";

interface DashboardProps {
  update: FocusUpdate;
  onEnd: () => void;
  reloadToken: number;
  notesMode: boolean;
  onToggleNotes: (enabled: boolean) => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  alertsCount: number;
}

function StatusCard({
  tone,
  icon,
  label,
  value,
  mono,
}: {
  tone: Tone;
  icon: string;
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className={`metric-card ${tone}`}>
      <div className="metric-icon">{icon}</div>
      <div className="metric-text">
        <div className="metric-label">{label}</div>
        <div className={`metric-value ${mono ? "mono" : ""}`}>{value}</div>
      </div>
    </div>
  );
}

export function Dashboard({
  update,
  onEnd,
  reloadToken,
  notesMode,
  onToggleNotes,
  soundEnabled,
  onToggleSound,
  alertsCount,
}: DashboardProps) {
  const focused = update.state === "FOCUSED";
  const lowTime =
    update.remaining_time !== null && update.remaining_time < 60;

  return (
    <div className="live-dashboard">
      {/* Top row: Daily Goal + prominent countdown */}
      <div className="live-top">
        <DailyGoal reloadToken={reloadToken} />

        <div className={`time-card ${lowTime ? "low" : ""}`}>
          <div className="time-card-label">Time Remaining</div>
          <div className="time-card-value mono">
            {update.remaining_time === null
              ? "--:--"
              : formatRemaining(update.remaining_time)}
          </div>
        </div>
      </div>

      {/* Primary live status cards */}
      <div className="live-status-row">
        <StatusCard
          tone={focused ? "green" : "red"}
          icon={focused ? "🎯" : "⚠️"}
          label="Focus Status"
          value={update.state}
        />
        <StatusCard
          tone="purple"
          icon="👁"
          label="Head/Gaze Direction"
          value={update.gaze}
        />
        <StatusCard
          tone="green"
          icon="🎥"
          label="Camera"
          value={
            <span className="cam-indicator">
              <span className="cam-dot" /> Active
            </span>
          }
        />
        <StatusCard
          tone="amber"
          icon="🔔"
          label="Alerts"
          value={alertsCount}
        />
      </div>

      {/* Secondary live metrics */}
      <div className="live-status-row">
        <StatusCard
          tone="indigo"
          icon="📊"
          label="Focus Score"
          value={update.score}
        />
        <StatusCard
          tone="blue"
          icon="⏱️"
          label="Focused Time"
          value={formatDuration(update.focused_time)}
        />
        <StatusCard
          tone="amber"
          icon="💤"
          label="Away Time"
          value={formatDuration(update.away_time)}
        />
        <StatusCard
          tone={update.phone_detected ? "red" : "green"}
          icon="📱"
          label="Phone"
          value={update.phone_detected ? "Detected" : "None"}
        />
      </div>

      {update.alert && <div className="alert-box">⚠️ {update.alert_reason}</div>}

      {/* Always-visible session controls */}
      <div className="live-controls">
        <button className="end-session-btn" onClick={onEnd}>
          ⏹ End Session
        </button>

        <label className="control-toggle">
          <input
            type="checkbox"
            checked={notesMode}
            onChange={(e) => onToggleNotes(e.target.checked)}
          />
          Notes Mode
        </label>

        <label className="control-toggle">
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => onToggleSound(e.target.checked)}
          />
          Sound Alert
        </label>
      </div>
    </div>
  );
}
