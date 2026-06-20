import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL } from "../constants";
import type {
  ClientMessage,
  ConnectionStatus,
  FocusUpdate,
  ServerMessage,
  SessionSummary,
} from "../types";

export type SessionPhase = "idle" | "running" | "finished";

export interface FocusSocket {
  status: ConnectionStatus;
  phase: SessionPhase;
  update: FocusUpdate | null;
  summary: SessionSummary | null;
  notesMode: boolean;
  startSession: (minutes: number) => void;
  setNotesMode: (enabled: boolean) => void;
  endSession: () => void;
  reset: () => void;
}

/**
 * Manages the lifecycle of the /ws/focus connection and exposes the latest
 * focus state. Mirrors the flow of the original test_ws.html: connect on
 * mount, start a session on demand, stream live updates, then show a summary
 * when the timer elapses.
 */
export function useFocusSocket(): FocusSocket {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [update, setUpdate] = useState<FocusUpdate | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [notesMode, setNotesMode] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  // Kept in sync so the (stable) onclose handler can read the current phase.
  const phaseRef = useRef<SessionPhase>("idle");
  phaseRef.current = phase;

  const send = useCallback((message: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }, []);

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    setStatus("connecting");

    ws.onopen = () => setStatus("connected");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as ServerMessage;

      if ("session_started" in data) {
        setNotesMode(data.notes_mode);
        setUpdate({
          timestamp: data.timestamp,
          score: 100,
          state: data.state,
          focused_time: data.focused_time,
          away_time: data.away_time,
          gaze: data.gaze,
          alert: false,
          alert_reason: null,
          remaining_time: data.duration_minutes * 60,
          notes_mode: data.notes_mode,
          phone_detected: data.phone_detected,
        });
        setPhase("running");
        return;
      }

      if ("session_finished" in data) {
        setSummary(data.summary);
        setPhase("finished");
        ws.close();
        return;
      }

      setUpdate(data);
      setNotesMode(data.notes_mode);
    };

    ws.onerror = () => setStatus("error");

    ws.onclose = () => {
      // Only surface "disconnected" if no session ever started; after a
      // session we close the socket ourselves and show the summary instead.
      if (phaseRef.current === "idle") setStatus("disconnected");
    };
  }, []);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  const startSession = useCallback(
    (minutes: number) => {
      send({ type: "START_SESSION", duration_minutes: minutes });
    },
    [send],
  );

  const updateNotesMode = useCallback(
    (enabled: boolean) => {
      setNotesMode(enabled);
      send({ type: "SET_NOTES_MODE", enabled });
    },
    [send],
  );

  const endSession = useCallback(() => {
    // The backend replies with a session_finished message, which the message
    // handler turns into the summary view (same path as a natural timeout).
    send({ type: "END_SESSION" });
  }, [send]);

  const reset = useCallback(() => {
    wsRef.current?.close();
    setUpdate(null);
    setSummary(null);
    setNotesMode(false);
    setPhase("idle");
    connect();
  }, [connect]);

  return {
    status,
    phase,
    update,
    summary,
    notesMode,
    startSession,
    setNotesMode: updateNotesMode,
    endSession,
    reset,
  };
}
