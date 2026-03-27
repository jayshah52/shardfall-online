"""
SHARDFALL V2 — Room/Lobby Manager
Manages multiplayer rooms, player identity, and game lifecycle.
"""
import uuid
import string
import random
from datetime import datetime
from typing import Optional, Tuple
from .engine import ShardFallEngine

# In-memory room storage
rooms = {}

class Room:
    def __init__(self, host_name: str, player_count: int, mode: str = "normal"):
        self.code = self._gen_code()
        self.player_count = player_count
        self.mode = mode
        self.players: list[dict] = []
        self.engine: ShardFallEngine | None = None
        self.created_at = datetime.now()
        self.host_id = self.add_player(host_name, is_host=True)

    @staticmethod
    def _gen_code() -> str:
        chars = string.ascii_uppercase + string.digits
        for _ in range(100):
            code = ''.join(random.choices(chars, k=4))
            if code not in rooms:
                return code
        return str(uuid.uuid4())[:6].upper()

    def add_player(self, name: str, is_host: bool = False) -> str:
        if len(self.players) >= self.player_count:
            return ""
        player_id = str(uuid.uuid4())[:8]
        self.players.append({
            "id": player_id,
            "name": name,
            "index": len(self.players),
            "is_host": is_host,
        })
        return player_id

    def get_player_by_id(self, player_id: str) -> Optional[dict]:
        for p in self.players:
            if p["id"] == player_id:
                return p
        return None

    def is_full(self) -> bool:
        return len(self.players) >= self.player_count

    def start_game(self) -> bool:
        if not self.is_full() or self.engine is not None:
            return False
        names = [p["name"] for p in self.players]
        self.engine = ShardFallEngine(names, mode=self.mode)
        return True

    def get_state(self, player_id: Optional[str] = None) -> dict:
        """Return room state, filtering secrets based on requesting player."""
        player = self.get_player_by_id(player_id) if player_id else None

        state = {
            "room_code": self.code,
            "room_status": "playing" if self.engine else "waiting",
            "player_count": self.player_count,
            "room_mode": self.mode,
            "room_players": [
                {
                    "name": p["name"],
                    "index": p["index"],
                    "is_host": p["is_host"],
                    "is_you": p["id"] == player_id if player_id else False,
                }
                for p in self.players
            ],
            "your_index": player["index"] if player else -1,
        }

        if self.engine:
            game_state = self.engine.get_state()

            # Filter per-player secrets
            if player:
                for gp in game_state["players"]:
                    if gp["index"] != player["index"]:
                        # Hide other players' contracts and choices
                        gp["contracts"] = [{"id": "hidden", "name": "???", "icon": "📜", "vp": "?", "requirement": "Secret"} for _ in gp.get("contracts", [])]
                        gp["contract_choices"] = []
                        gp["seeker_choices"] = []
                    else:
                        # Show your own
                        pass

            state.update(game_state)

        return state


def create_room(host_name: str, player_count: int, mode: str = "normal") -> Tuple[Room, str]:
    room = Room(host_name, player_count, mode)
    rooms[room.code] = room
    return room, room.host_id


def join_room(code: str, player_name: str) -> Tuple[Optional[Room], str]:
    room = rooms.get(code.upper())
    if not room:
        return None, ""
    if room.engine is not None:
        return None, ""  # Game already started
    if room.is_full():
        return None, ""
    player_id = room.add_player(player_name)
    return room, player_id


def get_room(code: str) -> Optional[Room]:
    return rooms.get(code.upper())


def cleanup_old_rooms():
    """Remove rooms older than 3 hours."""
    now = datetime.now()
    expired = [code for code, room in rooms.items()
               if (now - room.created_at).seconds > 10800]
    for code in expired:
        del rooms[code]
