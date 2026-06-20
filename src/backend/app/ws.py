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

                    # Start every session with clean detector state so gaze
                    # calibration and face smoothing don't carry over from a
                    # previous session in the same app run.
                    face_detector.reset()
                    gaze_detector.reset()
                    phone_detector.reset()

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

        loop = asyncio.get_running_loop()

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

                elif data and data.get("type") == "END_SESSION":
                    print("END_SESSION received")
                    update = engine.end_session()
                    summary = update["summary"]
                    save_session(
                        start_time=summary["start_time"],
                        end_time=summary["end_time"],
                        focused_time=summary["focused_time"],
                        away_time=summary["away_time"],
                        alerts_count=summary["alerts_count"]
                    )
                    update["phone_detected"] = False
                    await websocket.send_json(update)
                    break

            except asyncio.TimeoutError:
                pass
            except WebSocketDisconnect:
                print("WebSocket disconnected during session")
                break

            ret, frame = cap.read()
            if not ret:
                # Camera unavailable or a dropped frame: keep the session
                # progressing (the timer and finish logic still run) but treat
                # this tick as "no input" instead of freezing the session.
                face_detected = False
                gaze = "NO_FACE"
                phone_detected = False
                display_gaze = "NO_FACE"
            else:
                frame = cv2.flip(frame, 1)

                # Run the blocking vision work off the event loop so the
                # WebSocket stays responsive to control messages and sends.
                face_detected = await loop.run_in_executor(
                    None, face_detector.detect, frame
                )
                if face_detected:
                    gaze = await loop.run_in_executor(
                        None, gaze_detector.detect, frame
                    )
                    # Faster LEFT/RIGHT value for the UI indicator only.
                    display_gaze = gaze_detector.display_gaze or gaze
                else:
                    gaze = "NO_FACE"
                    display_gaze = "NO_FACE"
                phone_detected = await loop.run_in_executor(
                    None, phone_detector.detect, frame
                )

            # `gaze` (stable) drives the engine's 4s AWAY/alert timing unchanged.
            update = engine.update(face_detected, gaze, phone_detected)

            if update is None:
                await asyncio.sleep(0.1)
                continue

            update["phone_detected"] = phone_detected
            # Show the faster indicator value on the dashboard without affecting
            # the engine logic above.
            if "session_finished" not in update:
                update["gaze"] = display_gaze

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