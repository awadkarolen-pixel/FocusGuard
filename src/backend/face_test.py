import cv2
from app.vision_face import FaceDetector

cap = cv2.VideoCapture(0)
detector = FaceDetector()

print("Press Q to quit")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    has_face = detector.detect(frame)

    text = "FACE DETECTED" if has_face else "NO FACE"
    color = (0, 255, 0) if has_face else (0, 0, 255)

    cv2.putText(
        frame, text, (30, 50),
        cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2
    )

    cv2.imshow("FocusGuard Face Test", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
