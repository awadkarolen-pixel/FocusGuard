import cv2
import mediapipe as mp
import time

# Hold the last valid gaze for this long during brief face-mesh losses (e.g.
# turning your head) instead of immediately reporting NO_FACE. Only after the
# mesh is missing continuously for longer than this do we emit NO_FACE.
GAZE_GRACE_PERIOD = 2.5

# Horizontal threshold on the combined (head + iris) signal for LEFT/RIGHT.
H_THRESHOLD = 0.045
# Head-down threshold (relative to the calibrated baseline).
V_THRESHOLD = 0.05

# How much the eye/iris offset contributes relative to head offset. Tuned so a
# clear eye movement (head centered) can register, while small eye drift cannot.
IRIS_WEIGHT = 0.3
# Flip to -1.0 if, on your camera, eye-left/right comes out inverted.
IRIS_SIGN = 1.0

# A new LEFT/RIGHT/DOWN/CENTER must be seen this many detections in a row before
# it is committed, so the output is not jumpy. This stable value is what detect()
# returns and what the focus engine uses for the 4s AWAY/alert timing.
STABLE_FRAMES = 2

# The dashboard indicator shows LEFT/RIGHT as soon as a horizontal raw reading
# appears (0.0 = immediate, the first frame the detector sees it). This only
# affects the displayed `display_gaze`; it does NOT change detect()'s return
# value, so AWAY status and alert timing (the engine's 4s rule) are unaffected.
FAST_HORIZONTAL_HOLD = 0.0  # seconds (immediate)

DEBUG = False

# Iris + eye-corner landmark indices (require refine_landmarks=True → 478 pts).
LEFT_IRIS = 468
RIGHT_IRIS = 473
LEFT_EYE_OUTER, LEFT_EYE_INNER = 33, 133
RIGHT_EYE_INNER, RIGHT_EYE_OUTER = 362, 263


class GazeDetector:
    def __init__(self):
        # Lower detection/tracking confidence than the default 0.5 helps keep a
        # lock on side / head-turned faces. refine_landmarks=True adds the iris
        # landmarks used for the eye-gaze component.
        self.face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.4,
            min_tracking_confidence=0.4,
        )

        # --- Calibration (per-user neutral head pose) ---
        self.baseline_dx = None
        self.baseline_dy = None
        self.calibration_start = time.time()
        self.calibration_duration = 2.0  # seconds
        self.dx_samples = []
        self.dy_samples = []

        # --- Smoothing / grace ---
        self.last_gaze = None
        self.last_gaze_time = None

        # --- Debounce (stable-detection smoothing) ---
        self._pending_raw = None
        self._pending_count = 0
        self.last_committed = None

        # --- Fast horizontal value for the UI indicator only ---
        self.display_gaze = None
        self._fast_raw = None
        self._fast_since = None

    def reset(self):
        """Clear calibration and smoothing so a new session recalibrates."""
        self.baseline_dx = None
        self.baseline_dy = None
        self.calibration_start = time.time()
        self.dx_samples = []
        self.dy_samples = []
        self.last_gaze = None
        self.last_gaze_time = None
        self._pending_raw = None
        self._pending_count = 0
        self.last_committed = None
        self.display_gaze = None
        self._fast_raw = None
        self._fast_since = None

    def _iris_offset(self, landmarks):
        """
        Average horizontal iris position relative to each eye's centre,
        normalized by eye width. ~0 when looking straight, positive toward the
        image-right. Returns 0.0 if iris landmarks are unavailable (head-only
        fallback).
        """
        if len(landmarks) <= RIGHT_IRIS:
            return 0.0

        def eye_offset(iris_i, corner_a, corner_b):
            iris = landmarks[iris_i]
            a = landmarks[corner_a]
            b = landmarks[corner_b]
            center = (a.x + b.x) / 2.0
            width = abs(a.x - b.x)
            if width < 1e-6:
                return 0.0
            return (iris.x - center) / width

        left = eye_offset(LEFT_IRIS, LEFT_EYE_OUTER, LEFT_EYE_INNER)
        right = eye_offset(RIGHT_IRIS, RIGHT_EYE_INNER, RIGHT_EYE_OUTER)
        return (left + right) / 2.0

    def _smooth(self, raw):
        """Commit a new direction only after STABLE_FRAMES consecutive agreements."""
        if raw == self._pending_raw:
            self._pending_count += 1
        else:
            self._pending_raw = raw
            self._pending_count = 1

        if self.last_committed is None or self._pending_count >= STABLE_FRAMES:
            self.last_committed = raw
        return self.last_committed

    def detect(self, frame):
        """
        Returns: CENTER, LEFT, RIGHT, DOWN, or NO_FACE.

        LEFT/RIGHT combine head direction (nose vs eye-corner midpoint) with an
        eye-gaze component (iris position within the eye). Head direction is the
        stable base; iris refines it and is used as a fallback-free addition.
        Brief mesh losses hold the last gaze for up to GAZE_GRACE_PERIOD seconds.
        """
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb)
        now = time.time()

        # --- No landmarks this frame: apply grace before reporting NO_FACE ---
        if not results.multi_face_landmarks:
            missing_for = (
                0.0 if self.last_gaze_time is None else now - self.last_gaze_time
            )
            if self.last_gaze is not None and missing_for <= GAZE_GRACE_PERIOD:
                gaze = self.last_gaze  # keep last valid state for short drops
            else:
                gaze = "NO_FACE"

            # NO_FACE behavior unchanged: indicator mirrors the stable value.
            self.display_gaze = gaze

            if DEBUG:
                print(
                    f"[gaze] raw=NO_FACE smoothed={gaze} "
                    f"missing_for={missing_for:.1f}s"
                )
            return gaze

        landmarks = results.multi_face_landmarks[0].landmark

        nose = landmarks[1]
        left_eye = landmarks[LEFT_EYE_OUTER]
        right_eye = landmarks[RIGHT_EYE_OUTER]

        eye_center_x = (left_eye.x + right_eye.x) / 2
        eye_center_y = (left_eye.y + right_eye.y) / 2

        head_dx = nose.x - eye_center_x
        dy = nose.y - eye_center_y

        # --- CALIBRATION PHASE ---
        if self.baseline_dy is None:
            self.dx_samples.append(head_dx)
            self.dy_samples.append(dy)

            if now - self.calibration_start >= self.calibration_duration:
                self.baseline_dx = sum(self.dx_samples) / len(self.dx_samples)
                self.baseline_dy = sum(self.dy_samples) / len(self.dy_samples)

            self.last_gaze = "CENTER"
            self.last_gaze_time = now
            self.last_committed = "CENTER"
            self.display_gaze = "CENTER"
            return "CENTER"

        dy_rel = dy - self.baseline_dy

        # Combine head direction with the eye-gaze (iris) component. Head is the
        # stable base; iris lets clear eye movement register even with a centered
        # head, but is weighted so it cannot flip the result on its own jitter.
        # Head term is relative to the calibrated neutral pose so an off-centre
        # head/camera angle doesn't read as a constant LEFT/RIGHT (a common
        # false-alert cause). Iris offset is already centred per eye, so only
        # the head term needs the baseline.
        head_dx_rel = head_dx - (self.baseline_dx or 0.0)
        iris_dx = IRIS_SIGN * self._iris_offset(landmarks)
        combined_x = head_dx_rel + IRIS_WEIGHT * iris_dx

        if combined_x > H_THRESHOLD:
            raw = "RIGHT"
        elif combined_x < -H_THRESHOLD:
            raw = "LEFT"
        elif dy_rel > V_THRESHOLD:
            raw = "DOWN"
        else:
            raw = "CENTER"

        gaze = self._smooth(raw)

        # Fast horizontal value for the UI indicator only. As soon as a LEFT/
        # RIGHT raw reading has held for FAST_HORIZONTAL_HOLD it is shown, even
        # if the stable `gaze` (used by the engine) has not committed yet. For
        # any non-horizontal raw it mirrors the stable value (DOWN unchanged).
        if raw != self._fast_raw:
            self._fast_raw = raw
            self._fast_since = now
        if raw in ("LEFT", "RIGHT") and (now - self._fast_since) >= FAST_HORIZONTAL_HOLD:
            self.display_gaze = raw
        else:
            self.display_gaze = gaze

        self.last_gaze = gaze
        self.last_gaze_time = now

        if DEBUG:
            print(
                f"[gaze] raw={raw} stable={gaze} display={self.display_gaze} "
                f"head_dx_rel={head_dx_rel:.3f} iris_dx={iris_dx:.3f} "
                f"combined={combined_x:.3f}"
            )

        return gaze
