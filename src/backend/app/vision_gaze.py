import cv2
import mediapipe as mp
import time


class GazeDetector:
    def __init__(self):
        self.face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

        # --- Calibration ---
        self.baseline_dy = None
        self.calibration_start = time.time()
        self.calibration_duration = 2.0  # seconds
        self.dy_samples = []

    def detect(self, frame):
        """
        Returns: CENTER, LEFT, RIGHT, DOWN, or NO_FACE
        """
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb)

        if not results.multi_face_landmarks:
            return "NO_FACE"

        landmarks = results.multi_face_landmarks[0].landmark

        nose = landmarks[1]
        left_eye = landmarks[33]
        right_eye = landmarks[263]

        eye_center_x = (left_eye.x + right_eye.x) / 2
        eye_center_y = (left_eye.y + right_eye.y) / 2

        dx = nose.x - eye_center_x
        dy = nose.y - eye_center_y

        # --- CALIBRATION PHASE ---
        if self.baseline_dy is None:
            self.dy_samples.append(dy)

            if time.time() - self.calibration_start >= self.calibration_duration:
                self.baseline_dy = sum(self.dy_samples) / len(self.dy_samples)

            return "CENTER"

        # --- RELATIVE GAZE ---
        dy_rel = dy - self.baseline_dy

        if abs(dx) < 0.04 and abs(dy_rel) < 0.04:
            return "CENTER"
        elif dx > 0.04:
            return "RIGHT"
        elif dx < -0.04:
            return "LEFT"
        elif dy_rel > 0.05:
            return "DOWN"
        else:
            return "CENTER"