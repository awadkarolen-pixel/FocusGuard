import time

AWAY_FACE_THRESHOLD = 3.0
SIDE_GAZE_THRESHOLD = 4.0
DOWN_GAZE_THRESHOLD = 7.0

DISTRACTED_GAZES = {"LEFT", "RIGHT", "DOWN"}


class FocusEngine:
    def __init__(self):
        self.session_duration = None
        self.session_end_time = None
        self.session_active = False
        self.notes_mode = False

        self.reset_session()

    def reset_session(self):
        self.session_start = time.time()
        self.last_update = self.session_start

        self.last_face_seen = self.session_start
        self.last_center_gaze = self.session_start

        self.state = "FOCUSED"
        self.focused_time = 0.0
        self.away_time = 0.0
        self.alerts_count = 0

    def start_session(self, duration_minutes: int):
        self.reset_session()
        self.session_duration = duration_minutes * 60
        self.session_end_time = self.session_start + self.session_duration
        self.session_active = True

    def set_notes_mode(self, enabled: bool):
        self.notes_mode = enabled

    def end_session_summary(self):
        total_time = self.focused_time + self.away_time
        focus_percentage = (
            (self.focused_time / total_time) * 100
            if total_time > 0 else 0
        )

        return {
            "start_time": self.session_start,
            "end_time": time.time(),
            "focused_time": round(self.focused_time, 1),
            "away_time": round(self.away_time, 1),
            "focus_percentage": round(focus_percentage, 1),
            "alerts_count": self.alerts_count
        }

    def update(self, face_detected: bool, gaze: str):
        if not self.session_active:
            return None

        now = time.time()

        if self.session_end_time and now >= self.session_end_time:
            self.session_active = False
            return {
                "session_finished": True,
                "summary": self.end_session_summary()
            }

        delta = now - self.last_update
        self.last_update = now

        if self.state == "FOCUSED":
            self.focused_time += delta
        else:
            self.away_time += delta

        alert = False
        alert_reason = None

        # Face logic
        if face_detected:
            self.last_face_seen = now
        else:
            if now - self.last_face_seen > AWAY_FACE_THRESHOLD:
                if self.state != "AWAY":
                    self.alerts_count += 1
                self.state = "AWAY"
                alert = True
                alert_reason = "Face not detected"

        # Gaze logic
        if gaze == "CENTER":
            self.last_center_gaze = now

        elif gaze in {"LEFT", "RIGHT"}:
            if now - self.last_center_gaze > SIDE_GAZE_THRESHOLD:
                if self.state != "AWAY":
                    self.alerts_count += 1
                self.state = "AWAY"
                alert = True
                alert_reason = f"Looking {gaze.lower()} too long"

        elif gaze == "DOWN":
            # Notes mode: allow writing / looking down
            if not self.notes_mode:
                if now - self.last_center_gaze > DOWN_GAZE_THRESHOLD:
                    if self.state != "AWAY":
                        self.alerts_count += 1
                    self.state = "AWAY"
                    alert = True
                    alert_reason = "Looking down for a long time — stay focused"

        if face_detected and (gaze == "CENTER" or (self.notes_mode and gaze == "DOWN")):
            self.state = "FOCUSED"

        remaining_time = None
        if self.session_end_time:
            remaining_time = max(0, int(self.session_end_time - now))

        return {
            "timestamp": now,
            "score": 100 if self.state == "FOCUSED" else 0,
            "state": self.state,
            "focused_time": round(self.focused_time, 1),
            "away_time": round(self.away_time, 1),
            "gaze": gaze,
            "alert": alert,
            "alert_reason": alert_reason,
            "remaining_time": remaining_time,
            "notes_mode": self.notes_mode
        }