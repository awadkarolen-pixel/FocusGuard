# FocusGuard — Webcam-Based Focus Monitoring

FocusGuard is a local desktop application that helps students stay focused while
studying. A webcam monitors attention during a study session and gives a small
alert when it detects loss of focus (looking away, leaving the camera, or using
a phone). All processing is done locally — no video is stored and no data leaves
the computer.

---

## Architecture

```
Electron desktop window  ──loads──>  React UI (Vite + TypeScript)
        │                                   │
        │ spawns + manages                  │ WebSocket  ws://127.0.0.1:8000/ws/focus
        ▼                                   ▼
FastAPI backend (Python)  ── OpenCV + MediaPipe (face / gaze) + YOLO11 (phone) ──> focus engine ──> SQLite
```

- **Frontend** — React + TypeScript (Vite), packaged as an Electron desktop app.
- **Backend** — FastAPI server; vision via OpenCV, MediaPipe (face + gaze) and
  YOLO11 / Ultralytics (phone detection); focus scoring in `focus_engine.py`.
- **Database** — SQLite (`focusguard.db`), session summaries only.
- Frontend ⇄ backend communicate over a WebSocket for real-time updates.

```
src/
  backend/                  FastAPI app + vision + focus engine
    app/                    main.py, ws.py, focus_engine.py, vision_*.py, db.py
    requirements.txt
    yolo11s.pt              YOLO11 model used for phone detection
    setup.bat               one-time backend setup for packaged builds
  frontend/
    focusguard-app/         React + Electron app (see its own README)
docs/                       detailed design (PDF)
diagrams/                   PlantUML diagrams (activity, class, component, sequence)
```

---

## Prerequisites

- **Python 3.12** (MediaPipe wheels may not exist for newer versions). On
  Windows, tick **"Add python.exe to PATH"** during install.
- **Node.js 18+** (developed with Node 22) and npm.
- A working **webcam**. On Windows, enable
  **Settings → Privacy & security → Camera → "Let desktop apps access your
  camera."** Close other apps that may hold the camera (Zoom, Teams, OBS).

---

## Run it (development)

### 1. Backend (FastAPI)

```bash
cd src/backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
```

The YOLO11 model used for phone detection (`yolo11s.pt`) is **committed to the
repository** at `src/backend/yolo11s.pt`, so the backend runs from a fresh clone
without downloading anything at startup (no internet required for the model).

### 2. Desktop app (Electron + React)

```bash
cd src/frontend/focusguard-app
npm install
npm run app
```

`npm run app` starts the Vite dev server **and** the Electron window, and
Electron automatically launches the FastAPI backend from `src/backend/.venv`
(so you do not need to start uvicorn yourself). It waits for the backend's
`/health` endpoint, then loads the UI.

> If `npm install` fails with a TLS certificate error behind a corporate proxy,
> run it as `NODE_OPTIONS=--use-system-ca npm install`.

### Run in a browser instead (no Electron)

```bash
# Terminal 1
cd src/backend && python -m uvicorn app.main:app --reload
# Terminal 2
cd src/frontend/focusguard-app && npm run dev
# then open http://localhost:5173/
```

---

## How to use

1. Open the app and pick a session length (30 min, 50 min, or a custom
   Hours + Minutes), or set a Daily Goal first.
2. The session starts; the live dashboard shows focus status, gaze direction,
   time remaining, camera status, and alerts.
3. Looking away, leaving the camera, or using a phone for a few seconds triggers
   an alert (with an optional sound).
4. End the session (or let the timer finish) to see the summary; the
   **Statistics** and **History** tabs aggregate past sessions.

---

## Build a Windows installer

```bash
cd src/frontend/focusguard-app
npm run dist
```

Produces `release/FocusGuard Setup <version>.exe`. The installer bundles the UI,
the backend source, and the YOLO model, but **not** the heavy Python
dependencies — after installing, run the bundled `resources/backend/setup.bat`
once (it creates the venv and installs the libraries). See
`src/frontend/focusguard-app/README.md` for full packaging and distribution
notes.

---

## Privacy

- No video is recorded or stored.
- No data is sent to external servers.
- Only session summaries (focus state, times, alert counts, timestamps) are
  saved locally in SQLite.

---

## Documentation

- `docs/FocusGuard-Detailed-Design.pdf` — detailed design document.
- `diagrams/` — activity, class, component, and sequence diagrams (PlantUML).
- `src/frontend/focusguard-app/README.md` — frontend dev, run, and packaging.
