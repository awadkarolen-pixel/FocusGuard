import cv2
from app.vision_gaze import GazeDetector

cap = cv2.VideoCapture(0)
detector = GazeDetector()

print("Press Q to quit")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # 🔁 Flip frame horizontally (mirror effect)
    frame = cv2.flip(frame, 1)

    gaze = detector.detect(frame)

    cv2.putText(
        frame,
        f"Gaze: {gaze}",
        (30, 50),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 255, 0),
        2
    )

    cv2.imshow("FocusGuard Gaze Test", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
