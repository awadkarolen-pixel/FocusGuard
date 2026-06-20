import { useEffect, useRef, useState } from "react";
import { useFocusSocket } from "./hooks/useFocusSocket";
import { useTheme } from "./hooks/useTheme";
import { playSoftBeep } from "./lib/beep";
import type { ConnectionStatus } from "./types";
import { SessionControls } from "./components/SessionControls";
import { Dashboard } from "./components/Dashboard";
import { SummaryCard } from "./components/SummaryCard";
import { StatisticsPage } from "./components/StatisticsPage";
import { HistoryPage } from "./components/HistoryPage";
import { DailyGoal } from "./components/DailyGoal";
import { WelcomeScreen } from "./components/WelcomeScreen";

type View = "session" | "stats" | "history";

const CONNECTION_LABEL: Record<ConnectionStatus, string> = {
  connecting: "⏳ Connecting...",
  connected: "🟢 Connected",
  error: "🔴 Connection error",
  disconnected: "⚪ Disconnected",
};

export default function App() {
  const {
    status,
    phase,
    update,
    summary,
    notesMode,
    startSession,
    setNotesMode,
    endSession,
    reset,
  } = useFocusSocket();

  const { theme, toggle: toggleTheme } = useTheme();
  // Per-app-session only (not persisted): the welcome screen shows each time
  // the app opens, then is dismissed for the rest of this run.
  const [entered, setEntered] = useState(false);
  const [view, setView] = useState<View>("session");
  const [soundEnabled, setSoundEnabled] = useState(true);
  // Live alert count for the active session, derived from alert onsets so the
  // backend stays unchanged (the live payload carries no alerts_count).
  const [alertsCount, setAlertsCount] = useState(0);
  // Bumped when a session finishes so the daily-goal progress refetches.
  const [goalReloadToken, setGoalReloadToken] = useState(0);

  // Read latest sound preference from the alert effect without re-subscribing.
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;
  const lastAlertRef = useRef(false);

  useEffect(() => {
    if (!update) return;
    if (update.alert) {
      if (!lastAlertRef.current) setAlertsCount((count) => count + 1);
      if (soundRef.current) playSoftBeep();
    }
    lastAlertRef.current = update.alert;
  }, [update]);

  useEffect(() => {
    if (phase === "running") {
      setAlertsCount(0);
      lastAlertRef.current = false;
    }
    if (phase === "finished") setGoalReloadToken((token) => token + 1);
  }, [phase]);

  if (!entered) {
    return <WelcomeScreen onGetStarted={() => setEntered(true)} />;
  }

  return (
    <div className="card">
      <header className="hero">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        <h1>🧠 FocusGuard</h1>
        <div className="subtitle">Stay present. Study better.</div>
      </header>

      <div className="card-body">
      <div className="nav-tabs">
        <button
          className={`nav-tab ${view === "session" ? "active" : ""}`}
          onClick={() => setView("session")}
        >
          🧠 Session
        </button>
        <button
          className={`nav-tab ${view === "stats" ? "active" : ""}`}
          onClick={() => setView("stats")}
        >
          📊 Statistics
        </button>
        <button
          className={`nav-tab ${view === "history" ? "active" : ""}`}
          onClick={() => setView("history")}
        >
          📜 History
        </button>
      </div>

      {view === "stats" ? (
        <StatisticsPage />
      ) : view === "history" ? (
        <HistoryPage />
      ) : phase === "running" && update ? (
        <Dashboard
          update={update}
          onEnd={endSession}
          reloadToken={goalReloadToken}
          notesMode={notesMode}
          onToggleNotes={setNotesMode}
          soundEnabled={soundEnabled}
          onToggleSound={setSoundEnabled}
          alertsCount={alertsCount}
        />
      ) : phase === "finished" && summary ? (
        <SummaryCard
          summary={summary}
          onRestart={reset}
          onViewStatistics={() => setView("stats")}
          onViewHistory={() => setView("history")}
        />
      ) : (
        <div className="session-grid">
          <DailyGoal reloadToken={goalReloadToken} />

          <div className="panel session-setup">
            <div className="panel-title">Start a Session</div>
            <SessionControls
              running={phase === "running"}
              soundEnabled={soundEnabled}
              notesMode={notesMode}
              onToggleSound={setSoundEnabled}
              onToggleNotes={setNotesMode}
              onStart={startSession}
            />
            <div className="conn-status">{CONNECTION_LABEL[status]}</div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
