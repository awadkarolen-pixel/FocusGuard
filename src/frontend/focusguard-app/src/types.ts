export type FocusState = "FOCUSED" | "AWAY";

export type Gaze = "CENTER" | "LEFT" | "RIGHT" | "DOWN" | "NO_FACE";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "error"
  | "disconnected";

/** A live focus measurement pushed by the backend during a session. */
export interface FocusUpdate {
  timestamp: number;
  score: number;
  state: FocusState;
  focused_time: number;
  away_time: number;
  gaze: Gaze;
  alert: boolean;
  alert_reason: string | null;
  remaining_time: number | null;
  notes_mode: boolean;
  phone_detected: boolean;
}

/** First message after START_SESSION is acknowledged. */
export interface SessionStarted {
  session_started: true;
  duration_minutes: number;
  timestamp: number;
  state: FocusState;
  focused_time: number;
  away_time: number;
  gaze: Gaze;
  alert: boolean;
  notes_mode: boolean;
  phone_detected: boolean;
}

export interface SessionSummary {
  start_time: number;
  end_time: number;
  focused_time: number;
  away_time: number;
  focus_percentage: number;
  alerts_count: number;
}

/** Final message when the timer elapses. */
export interface SessionFinished {
  session_finished: true;
  summary: SessionSummary;
  phone_detected?: boolean;
}

export type ServerMessage = SessionStarted | SessionFinished | FocusUpdate;

/** A persisted session as returned by GET /sessions. */
export interface SessionHistoryItem {
  id: number;
  start_time: number;
  end_time: number;
  focused_time: number;
  away_time: number;
  alerts_count: number;
  focus_percentage: number;
}

/** Messages the client sends to the backend. */
export type ClientMessage =
  | { type: "START_SESSION"; duration_minutes: number }
  | { type: "SET_NOTES_MODE"; enabled: boolean }
  | { type: "END_SESSION" };
