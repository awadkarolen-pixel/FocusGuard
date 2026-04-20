from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from app.ws import ws_loop
from app.db import get_all_sessions

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/sessions")
def sessions():
    return get_all_sessions()


@app.websocket("/ws/focus")
async def focus_ws(websocket: WebSocket):
    print("WebSocket connection request received")
    await websocket.accept()
    print("WebSocket accepted")
    await ws_loop(websocket)