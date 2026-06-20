import { useState, type FormEvent } from "react";

const MAX_HOURS = 12;

interface SessionControlsProps {
  running: boolean;
  soundEnabled: boolean;
  notesMode: boolean;
  onToggleSound: (enabled: boolean) => void;
  onToggleNotes: (enabled: boolean) => void;
  onStart: (minutes: number) => void;
}

export function SessionControls({
  running,
  soundEnabled,
  notesMode,
  onToggleSound,
  onToggleNotes,
  onStart,
}: SessionControlsProps) {
  const [hoursDraft, setHoursDraft] = useState("");
  const [minutesDraft, setMinutesDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function startCustom(event: FormEvent) {
    event.preventDefault();

    const hours = Number(hoursDraft.trim() || "0");
    const minutes = Number(minutesDraft.trim() || "0");

    const validHours = Number.isInteger(hours) && hours >= 0 && hours <= MAX_HOURS;
    const validMinutes =
      Number.isInteger(minutes) && minutes >= 0 && minutes <= 59;
    if (!validHours || !validMinutes) {
      setError(`Enter whole hours (0–${MAX_HOURS}) and minutes (0–59).`);
      return;
    }

    const total = hours * 60 + minutes;
    if (total < 1) {
      setError("Enter a session length of at least 1 minute.");
      return;
    }

    setError(null);
    onStart(total);
  }

  return (
    <>
      <div className="session-buttons">
        <button disabled={running} onClick={() => onStart(30)}>
          ▶ 30-min Focus
        </button>
        <button disabled={running} onClick={() => onStart(50)}>
          ▶ 50-min Deep Focus
        </button>
      </div>

      <form className="custom-session" onSubmit={startCustom}>
        <label className="goal-field">
          <span className="goal-field-label">Hours</span>
          <input
            type="number"
            className="goal-input"
            inputMode="numeric"
            min={0}
            max={MAX_HOURS}
            step={1}
            placeholder="0"
            value={hoursDraft}
            disabled={running}
            aria-label="Custom session hours"
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
            placeholder="0"
            value={minutesDraft}
            disabled={running}
            aria-label="Custom session minutes"
            onChange={(e) => {
              setMinutesDraft(e.target.value);
              if (error) setError(null);
            }}
          />
        </label>

        <button type="submit" disabled={running}>
          ▶ Start custom
        </button>
      </form>

      {error && <div className="custom-session-error">{error}</div>}

      <div className="toggle-row">
        <input
          type="checkbox"
          id="soundToggle"
          checked={soundEnabled}
          onChange={(e) => onToggleSound(e.target.checked)}
        />
        <label htmlFor="soundToggle">Enable sound alert</label>
      </div>

      <div className="toggle-row">
        <input
          type="checkbox"
          id="notesToggle"
          checked={notesMode}
          onChange={(e) => onToggleNotes(e.target.checked)}
        />
        <label htmlFor="notesToggle">Notes Mode (writing)</label>
      </div>
    </>
  );
}
