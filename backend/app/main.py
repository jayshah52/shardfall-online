"""
SHARDFALL V2 — FastAPI Backend Server (Multiplayer)
Room-based multiplayer with player identity and polling.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pathlib import Path
from .rooms import create_room, join_room, get_room, cleanup_old_rooms

app = FastAPI(title="SHARDFALL V2 API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])


# === MODELS ===

class CreateRoomRequest(BaseModel):
    host_name: str
    player_count: int

class JoinRoomRequest(BaseModel):
    player_name: str

class ChooseSeekerRequest(BaseModel):
    player_id: str
    choice_index: int

class ChooseContractsRequest(BaseModel):
    player_id: str
    chosen_indices: list[int]

class ActionRequest(BaseModel):
    player_id: str
    action: str
    params: dict = {}


# === ROOM ENDPOINTS ===

@app.get("/api/health")
def health():
    cleanup_old_rooms()
    return {"status": "ok", "game": "SHARDFALL V2"}


@app.post("/api/rooms")
def api_create_room(req: CreateRoomRequest):
    if req.player_count < 2 or req.player_count > 5:
        raise HTTPException(400, "Need 2-5 players")
    name = req.host_name.strip() or "Host"
    room, host_id = create_room(name, req.player_count)
    return {
        "room_code": room.code,
        "player_id": host_id,
        **room.get_state(host_id),
    }


@app.post("/api/rooms/{code}/join")
def api_join_room(code: str, req: JoinRoomRequest):
    name = req.player_name.strip() or "Player"
    room, player_id = join_room(code, name)
    if not room:
        raise HTTPException(404, "Room not found, full, or game already started")
    return {
        "room_code": room.code,
        "player_id": player_id,
        **room.get_state(player_id),
    }


@app.get("/api/rooms/{code}")
def api_get_room(code: str, pid: str = ""):
    room = get_room(code)
    if not room:
        raise HTTPException(404, "Room not found")
    return room.get_state(pid)


@app.post("/api/rooms/{code}/start")
def api_start_game(code: str, req: dict):
    room = get_room(code)
    if not room:
        raise HTTPException(404, "Room not found")
    player_id = req.get("player_id", "")
    player = room.get_player_by_id(player_id)
    if not player or not player["is_host"]:
        raise HTTPException(403, "Only the host can start the game")
    if not room.is_full():
        raise HTTPException(400, f"Need {room.player_count} players ({len(room.players)} joined)")
    if not room.start_game():
        raise HTTPException(400, "Game already started")
    return room.get_state(player_id)


@app.post("/api/rooms/{code}/choose-seeker")
def api_choose_seeker(code: str, req: ChooseSeekerRequest):
    room = get_room(code)
    if not room or not room.engine:
        raise HTTPException(404, "Room/game not found")
    player = room.get_player_by_id(req.player_id)
    if not player:
        raise HTTPException(403, "Invalid player")
    result = room.engine.choose_seeker(player["index"], req.choice_index)
    if isinstance(result, dict) and result.get("error"):
        raise HTTPException(400, result["error"])
    return room.get_state(req.player_id)


@app.post("/api/rooms/{code}/choose-contracts")
def api_choose_contracts(code: str, req: ChooseContractsRequest):
    room = get_room(code)
    if not room or not room.engine:
        raise HTTPException(404, "Room/game not found")
    player = room.get_player_by_id(req.player_id)
    if not player:
        raise HTTPException(403, "Invalid player")
    result = room.engine.choose_contracts(player["index"], req.chosen_indices)
    if isinstance(result, dict) and result.get("error"):
        raise HTTPException(400, result["error"])
    return room.get_state(req.player_id)


@app.post("/api/rooms/{code}/action")
def api_do_action(code: str, req: ActionRequest):
    room = get_room(code)
    if not room or not room.engine:
        raise HTTPException(404, "Room/game not found")
    player = room.get_player_by_id(req.player_id)
    if not player:
        raise HTTPException(403, "Invalid player")
    # Only the current player can act
    if room.engine.current_player != player["index"]:
        phase = room.engine.phase
        if phase == "discard" and room.engine.current_player != player["index"]:
            raise HTTPException(400, "Not your turn — waiting for discard")
        elif phase == "playing":
            raise HTTPException(400, "Not your turn")
    result = room.engine.do_action(req.action, req.params)
    if isinstance(result, dict) and result.get("error"):
        raise HTTPException(400, result["error"])
    return room.get_state(req.player_id)


# === SERVE FRONTEND (Production) ===

STATIC_DIR = Path(__file__).parent.parent.parent / "frontend" / "dist"
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        """Serve React SPA — all non-API routes return index.html."""
        from fastapi.responses import FileResponse
        file_path = STATIC_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")
