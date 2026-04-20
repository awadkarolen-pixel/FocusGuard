import asyncio
import time
import json
import cv2
from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

from app.vision_face import FaceDetector
from app.vision_gaze import GazeDetector
from app.vision_phone import PhoneDetector
from app.focus_engine import FocusEngine
from app.db import init_db, save_session

init_db()

face_detector = FaceDetector()
gaze_detector = GazeDetector()
phone_detector = PhoneDetector()


async def ws_loop(websocket: WebSocket):
    print("ws_loop started")
    cap = cv2.VideoCapture(0)
    print("camera opened:", cap.isOpened())
    engine = FocusEngine()

    try:
        # Wait for session start
        while True:
            try:
                msg = await websocket.receive_text()
                print("raw message:", msg)

                try:
                    data = json.loads(msg)
                except json.JSONDecodeError:
                    continue

                if data.get("type") == "START_SESSION":
                    print("START_SESSION received:", data["duration_minutes"])
                    engine.start_session(data["duration_minutes"])

                    await websocket.send_json({
                        "session_started": True,
                        "duration_minutes": data["duration_minutes"],
                        "timestamp": time.time(),
                        "state": "FOCUSED",
                        "focused_time": 0,
                        "away_time": 0,
                        "gaze": "CENTER",
                        "alert": False,
                        "notes_mode": engine.notes_mode,
                        "phone_detected": False
                    })
                    break

            except WebSocketDisconnect:
                print("WebSocket disconnected before session start")
                return

        # Real-time loop
        while True:
            # Non-blocking control messages during session
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=0.01)
                print("raw message:", msg)

                try:
                    data = json.loads(msg)
                except json.JSONDecodeError:
                    data = None

                if data and data.get("type") == "SET_NOTES_MODE":
                    engine.set_notes_mode(bool(data.get("enabled", False)))
                    print("NOTES MODE:", engine.notes_mode)

            except asyncio.TimeoutError:
                pass
            except WebSocketDisconnect:
                print("WebSocket disconnected during session")
                break

            ret, frame = cap.read()
            if not ret:
                print("camera frame read failed")
                await asyncio.sleep(0.1)
                continue

            frame = cv2.flip(frame, 1)

            face_detected = face_detector.detect(frame)
            gaze = gaze_detector.detect(frame) if face_detected else "NO_FACE"
            phone_detected = phone_detector.detect(frame)

            update = engine.update(face_detected, gaze)

            if update is None:
                await asyncio.sleep(0.1)
                continue

            update["phone_detected"] = phone_detected

            if "session_finished" in update:
                print("session finished")

                summary = update["summary"]
                save_session(
                    start_time=summary["start_time"],
                    end_time=summary["end_time"],
                    focused_time=summary["focused_time"],
                    away_time=summary["away_time"],
                    alerts_count=summary["alerts_count"]
                )

                await websocket.send_json(update)
                break

            await websocket.send_json(update)
            await asyncio.sleep(0.5)

    finally:
        print("ws_loop closing")
        cap.release()