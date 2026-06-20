import { useEffect, useState, type FormEvent } from "react";
import { API_BASE } from "../constants";
import type { SessionHistoryItem } from "../types";
import { useStoredNumber } from "../hooks/useStoredNumber";
import { formatMinutes } from "../lib/format";

const GOAL_KEY = "focusguard.dailyGoalMinutes";
const DEFAULT_GOAL = 120;
const MIN_GOAL = 1;
const MAX_GOAL = 1440; // 24 hours

/** Milliseconds at the start of today (local time). */
function startOfTodayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Daily study goal with progress from today's completed sessions.
 * The goal persists across restarts; `reloadToken` should change whenever a
 * session finishes so progress refreshes.
 */
export function DailyGoal({ reloadToken }: { reloadToken: number }) {
  const [goal, setGoal] = useStoredNumber(GOAL_KEY, DEFAULT_GOAL);
  const [studiedMinutes, setStudiedMinutes] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [hoursDraft, setHoursDraft] = useState(String(Math.floor(goal / 60)));
  const [minutesDraft, setMinutesDraft] = useState(String(goal % 60));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${API_BASE}/sessions`);
        const data = (await response.json()) as SessionHistoryItem[];
        const since = startOfTodayMs();
        const seconds = data
          .filter((s) => s.start_time * 1000 >= since)
          .reduce((sum, s) => sum + s.focused_time + s.away_time, 0);
        if (!cancelled) setStudiedMinutes(seconds / 60);
      } catch {
        if (!cancelled) setStudiedMinutes(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const studied = studiedMinutes ?? 0;
  const percent = goal > 0 ? Math.min(100, (studied / goal) * 100) : 0;
  const remaining = Math.max(0, goal - studied);
  const reached = goal > 0 && studied >= goal;
  const band = reached
    ? "complete"
    : percent >= 75
      ? "high"
      : percent >= 40
        ? "mid"
        : "low";

  function beginEdit() {
    setHoursDraft(String(Math.floor(goal / 60)));
    setMinutesDraft(String(goal % 60));
    setError(null);
    setEditing(true);
  }

  function saveGoal(event: FormEvent) {
    event.preventDefault();

    const hours = Number(hoursDraft.trim() || "0");
    const minutes = Number(minutesDraft.trim() || "0");

    const validHours = Number.isInteger(hours) && hours >= 0 && hours <= 24;
    const validMinutes =
      Number.isInteger(minutes) && minutes >= 0 && minutes <= 59;
    if (!validHours || !validMinutes) {
      setError("Enter whole hours (0–24) and minutes (0–59).");
      return;
    }

    const total = hours * 60 + minutes;
    if (total < MIN_GOAL || total > MAX_GOAL) {
      setError("Goal must be between 1 min and 24h.");
      return;
    }

    setGoal(total);
    setError(null);
    setEditing(false);
  }

  return (
    <div className="goal-card">
      <div className="goal-header">
        <span className="goal-title">🎯 Daily Goal</span>
        {!editing && (
          <button className="goal-edit-btn" onClick={beginEdit}>
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <form className="goal-edit" onSubmit={saveGoal}>
          <label className="goal-field">
            <span className="goal-field-label">Hours</span>
            <input
              type="number"
              className="goal-input"
              inputMode="numeric"
              min={0}
              max={24}
              step={1}
              value={hoursDraft}
              autoFocus
              onChange={(e) => {
                setHoursDraft(e.target.value);
                if (error) setError(null);
              }}
            />
          </label>

          <label className="goal-field">
            <span className="goal-field-label">Minutes</span>
            <input
              type="number"
              className="goal-input"
              inputMode="numeric"
              min={0}
              max={59}
              step={1}
              value={minutesDraft}
              onChange={(e) => {
                setMinutesDraft(e.target.value);
                if (error) setError(null);
              }}
            />
          </label>

          <button type="submit" className="goal-save-btn">
            Save
          </button>
          <button
            type="button"
            className="goal-cancel-btn"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <>
          <div className="goal-progress-track">
            <div
              className={`goal-progress-fill ${band}`}
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="goal-meta">
            <span>
              {formatMinutes(studied)} / {formatMinutes(goal)}
            </span>
            <span>{Math.round(percent)}%</span>
          </div>

          <div className="goal-remaining">
            {studiedMinutes === null
              ? "Couldn't load today's sessions."
              : reached
                ? "Goal reached — nice work! 🎉"
                : `${formatMinutes(remaining)} remaining today`}
          </div>
        </>
      )}

      {error && <div className="goal-error">{error}</div>}
    </div>
  );
}
