import time
import cv2
import mediapipe as mp

# How long to keep reporting "face present" after the last real detection.
# Bridges brief drops (e.g. turning your head) so a single missed frame does
# not flip to NO_FACE. Only after the face is missing for longer than this do
# we report absence. Tune in the 2–3s range.
FACE_GRACE_PERIOD = 2.5

# Print raw vs smoothed detection and how long the face has been missing.
DEBUG = False


class FaceDetector:
    def __init__(self, confidence=0.4, grace_period=FACE_GRACE_PERIOD, debug=DEBUG):
        # model_selection=0 is the short-range BlazeFace model, best for a
        # desktop webcam at arm's length. BlazeFace is biased toward frontal
        # faces, so a lower min_detection_confidence (0.4 vs the old 0.5)
        # improves detection of side / head-turned faces. Lower further (e.g.
        # 0.3) if profiles still drop, at the cost of more false positives.
        self.detector = mp.solutions.face_detection.FaceDetection(
            model_selection=0,
            min_detection_confidence=confidence,
        )
        self.grace_period = grace_period
        self.debug = debug
        self.last_seen = None  # timestamp of the last RAW detection

    def reset(self):
        """Clear smoothing state so a new session starts fresh."""
        self.last_seen = None

    def detect(self, frame):
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.detector.process(rgb)
        raw_detected = results.detections is not None

        now = time.time()
        if raw_detected:
            self.last_seen = now

        # Grace / smoothing: keep the last valid "present" state for short
        # detection drops; only report absence once the face has been missing
        # continuously for longer than the grace period.
        missing_for = 0.0 if self.last_seen is None else (now - self.last_seen)
        smoothed = self.last_seen is not None and missing_for <= self.grace_period

        if self.debug:
            print(
                f"[face] raw={raw_detected} smoothed={smoothed} "
                f"missing_for={missing_for:.1f}s"
            )

        return smoothed
