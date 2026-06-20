interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <div className="welcome">
      <div className="welcome-inner">
        <div className="welcome-logo">🧠</div>
        <h1 className="welcome-title">FocusGuard</h1>
        <p className="welcome-subtitle">Stay present. Study better.</p>
        <p className="welcome-desc">
          Real-time focus tracking with gaze and phone distraction detection.
        </p>

        <div className="welcome-features">
          <div className="welcome-feature">
            <span className="welcome-feature-icon">👁️</span>
            <span className="welcome-feature-label">Real-Time Focus Tracking</span>
          </div>
          <div className="welcome-feature">
            <span className="welcome-feature-icon">📱</span>
            <span className="welcome-feature-label">Phone Distraction Detection</span>
          </div>
          <div className="welcome-feature">
            <span className="welcome-feature-icon">📊</span>
            <span className="welcome-feature-label">Session Analytics &amp; History</span>
          </div>
        </div>

        <button className="welcome-cta" onClick={onGetStarted}>
          Start Focusing <span aria-hidden="true">→</span>
        </button>

        <p className="welcome-footer">Privacy-first • Runs locally on your device</p>
      </div>
    </div>
  );
}
