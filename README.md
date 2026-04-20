# FocusGuard — Webcam-Based Focus Monitoring

## Prototype

This repository contains a working prototype of FocusGuard, a system that helps students stay focused while studying using a webcam.

The prototype demonstrates real-time focus detection, alerts, session summary, and history tracking.

---

## Overview

FocusGuard is a local system that monitors attention during study sessions.

It detects situations such as:
- looking away from the screen
- not being present in front of the camera
- staying distracted for a long time

When this happens, the system gives a small alert to help the user refocus.

All processing is done locally on the computer. No video is saved.

---

## Prototype Goal

The goal of this prototype is to show that it is possible to detect loss of focus in real time using a webcam, and react to it with simple alerts.

It is mainly meant to test the idea and see if this kind of system can actually help during study sessions.

---

## Features

- Real-time focus state (Focused / Away)
- Focus score based on user behavior
- Audio alerts when distraction is detected
- Session timer
- Session summary after each session
- Session history saved locally
- Notes mode (reduces alerts while writing)

---

## System Structure

The system is divided into several parts:

- Frontend – a simple dashboard for displaying the focus state
- Backend – a FastAPI server that handles logic and communication
- Vision module – detects face presence and basic gaze direction
- Focus logic – decides whether the user is focused or distracted
- Local database – stores session data

The frontend and backend communicate using WebSocket for real-time updates.

---

## Technologies

- Python (FastAPI)
- OpenCV + MediaPipe
- SQLite
- HTML + JavaScript

---

## Prototype Status

What currently works:
- Face detection
- Detecting if the user is present or not
- Basic focus estimation
- Alerts after a period of distraction
- Session tracking and summary

Limitations and Future Improvements:
- Gaze detection is not very accurate
- The interface is basic (for demo purposes)
- Works only on desktop
- No user accounts or personalization

---

## Example Usage

1. The user starts a study session  
2. The webcam is activated  
3. The system shows the current focus state in real time  
4. If the user is distracted for too long, an alert is triggered  
5. At the end of the session, a summary is displayed  

---

## Privacy

FocusGuard is designed to work locally:

- No video is stored
- No data is sent to external servers
- Only simple session data (like focus states and timestamps) is saved

---

## How to Run

To run the project locally:

1. Go to the backend folder:


```
cd src/backend
```

2. Install the required libraries:

```
pip install fastapi uvicorn opencv-python mediapipe
```

3. Start the server:

```
python -m uvicorn app.main:app --reload
```

4. Open the frontend file:

```
src/frontend/test_ws.html
```