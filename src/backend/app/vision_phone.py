from ultralytics import YOLO


class PhoneDetector:
    def __init__(self):
        self.model = YOLO("yolo11s.pt")
        self.phone_labels = {"cell phone", "mobile phone", "phone"}
        self.confidence_threshold = 0.12

    def _has_phone(self, frame):
        results = self.model(frame, verbose=False)

        for result in results:
            for box in result.boxes:
                confidence = float(box.conf[0])
                class_id = int(box.cls[0])
                class_name = self.model.names[class_id]

                if class_name in self.phone_labels and confidence >= self.confidence_threshold:
                    return True

        return False

    def detect(self, frame):
        # Check full frame
        if self._has_phone(frame):
            return True

        # Check bottom part of frame separately
        height = frame.shape[0]
        bottom_part = frame[int(height * 0.45):, :]

        if self._has_phone(bottom_part):
            return True

        return False