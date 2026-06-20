# FocusGuard — Desktop app (Electron + React)

A Vite + React + TypeScript UI, packaged as an Electron desktop application.
Electron renders the UI in a native window and launches/manages the unchanged
FastAPI backend (OpenCV + MediaPipe + YOLO + WebSocket + SQLite) as a child
process. The backend itself is unmodified — see `src/backend`.

## Run as a desktop app

One command starts the Vite dev server and the Electron window; Electron starts
the Python backend for you and waits for `/health` before loading the UI:

```
cd src/frontend/focusguard-app
npm install
npm run app
```

Electron prefers the backend virtualenv at `src/backend/.venv`; if it's missing
it falls back to `python`/`python3` on PATH. Make sure the backend deps are
installed (`pip install -r src/backend/requirements.txt`).

## Package a distributable

```
npm run dist        # builds the UI, then runs electron-builder
```

Output lands in `release/`. The build config bundles `src/backend` as an app
resource (`extraResources`), excluding `.venv`, caches, the DB, and model
weights. NOTE: it does **not** bundle a Python runtime or the heavy Python deps
(torch/mediapipe/ultralytics) — the packaged app currently expects Python with
the backend requirements available on the target machine. Bundling a standalone
Python (e.g. via PyInstaller) is a follow-up if you need a fully self-contained
installer.

## Run in the browser (no Electron)

1. Start the backend (see the repo root `README.md`):

   ```
   cd src/backend
   py -m uvicorn app.main:app --reload
   ```

2. In another terminal:

   ```
   cd src/frontend/focusguard-app
   npm install
   npm run dev
   ```

   Then open http://localhost:5173/.

## Configuration

Backend endpoints default to `127.0.0.1:8000`. Override them with a `.env`
file (see `.env.example`):

```
VITE_WS_URL=ws://127.0.0.1:8000/ws/focus
VITE_API_BASE=http://127.0.0.1:8000
```

## Structure

- `electron/main.cjs` — Electron main process: launches/stops the backend and
  opens the window (dev server in development, bundled `dist/` when packaged).
- `src/hooks/useFocusSocket.ts` — WebSocket lifecycle and session state.
- `src/components/` — `SessionControls`, `Dashboard`, `SummaryCard`, `HistoryCard`.
- `src/lib/` — `beep.ts` (audio alert), `format.ts` (timer formatting).
- `src/types.ts` — shared message/data types matching the backend payloads.

## Notes

- StrictMode is intentionally omitted in `main.tsx` so the app opens a single
  WebSocket connection (the backend opens the webcam per connection).
- The "30-min Focus" button uses a 0.3-minute (~18s) test duration carried over
  from the prototype; change it in `SessionControls.tsx` for a real session.
