import cv2
import mediapipe as mp

class FaceDetector:
    def __init__(self, confidence=0.5):
        self.detector = mp.solutions.face_detection.FaceDetection(
            model_selection=0,
            min_detection_confidence=confidence
        )

    def detect(self, frame):
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.detector.process(rgb)
        return results.detections is not None
