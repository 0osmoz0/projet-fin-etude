from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import json, time, asyncio, re

app = FastAPI()

# ── Flags & étapes ────────────────────────────────────────────
STEPS = [
    {"id": "foothold",  "name": "Foothold",             "desc": "Pivot : /opt/omega/proofs/FOOTHOLD.txt",               "points": 100},
    {"id": "elevation", "name": "Élévation de privilèges", "desc": "Relay action=export&artifact=elevation",            "points": 200},
    {"id": "cctv",      "name": "CCTV — Angle mort",    "desc": "Export int-cam3-offline (timestamp chiffres)",         "points": 300},
    {"id": "alert",     "name": "Alarme silencée",       "desc": "Alarm : api/silence.php (token + fenêtre valides)",    "points": 275},
    {"id": "terrain",   "name": "Plan terrain",          "desc": "Export int-cam3-plan (alarme silencée + token admin)", "points": 350},
    {"id": "omega",     "name": "Dossier OMEGA",         "desc": "Vault : api/dossier.php?token=OMEGA-VAULT-SA-4421",    "points": 500},
]

FLAGS = {
    "foothold":  "FOOTHOLD: CASE-2194-A",
    "elevation": "ELEVATION: OPS-CLEARANCE-2",
    "cctv":      "CCTV: BLINDSPOT-OK-202604270200",
    "alert":     "ALERT: SILENCED-BT-4421",
    "terrain":   "TERRAIN: CAM3-PLAN-EXPORT-7F2A9C",
    # OMEGA : OMEGA: DOSSIER-OMEGA-SHA256=<64 hex chars>
    "omega":     None,  # dynamique — validé par pattern
}

OMEGA_PATTERN = re.compile(r"^OMEGA: DOSSIER-OMEGA-SHA256=[0-9a-f]{64}$")

def validate_flag(step_id: str, flag: str) -> bool:
    if step_id == "omega":
        return bool(OMEGA_PATTERN.match(flag.strip()))
    return flag.strip() == FLAGS.get(step_id, "")

# ── État en mémoire ───────────────────────────────────────────
state = {
    "running":    False,
    "start_time": None,
    "flags":      {s["id"]: None for s in STEPS},
    "team":       "Équipe 1",
}

clients: list[WebSocket] = []

# ── Helpers ───────────────────────────────────────────────────
async def broadcast():
    msg = json.dumps(build_state())
    dead = []
    for ws in clients:
        try:
            await ws.send_text(msg)
        except:
            dead.append(ws)
    for ws in dead:
        clients.remove(ws)

def build_state():
    elapsed = 0
    if state["running"] and state["start_time"]:
        elapsed = int(time.time() - state["start_time"])
    done   = sum(1 for v in state["flags"].values() if v is not None)
    points = sum(s["points"] for s in STEPS if state["flags"][s["id"]] is not None)
    total_pts = sum(s["points"] for s in STEPS)
    return {
        "running":    state["running"],
        "elapsed":    elapsed,
        "team":       state["team"],
        "done":       done,
        "total":      len(STEPS),
        "points":     points,
        "total_pts":  total_pts,
        "steps": [
            {
                "id":        s["id"],
                "name":      s["name"],
                "desc":      s["desc"],
                "points":    s["points"],
                "validated": state["flags"][s["id"]] is not None,
                "time":      state["flags"][s["id"]],
            }
            for s in STEPS
        ],
    }

# ── Routes ────────────────────────────────────────────────────
class FlagSubmit(BaseModel):
    step_id: str
    flag:    str

class TeamName(BaseModel):
    name: str

@app.get("/api/state")
def get_state():
    return build_state()

@app.post("/api/start")
async def start():
    state["running"]    = True
    state["start_time"] = time.time()
    state["flags"]      = {s["id"]: None for s in STEPS}
    await broadcast()
    return {"ok": True}

@app.post("/api/stop")
async def stop():
    state["running"] = False
    await broadcast()
    return {"ok": True}

@app.post("/api/reset")
async def reset():
    state["running"]    = False
    state["start_time"] = None
    state["flags"]      = {s["id"]: None for s in STEPS}
    await broadcast()
    return {"ok": True}

@app.post("/api/team")
async def set_team(body: TeamName):
    state["team"] = body.name
    await broadcast()
    return {"ok": True}

@app.post("/api/flag")
async def submit_flag(body: FlagSubmit):
    if body.step_id not in FLAGS:
        return {"ok": False, "msg": "Étape inconnue."}
    if state["flags"][body.step_id] is not None:
        return {"ok": False, "msg": "Déjà validé."}
    if not validate_flag(body.step_id, body.flag):
        return {"ok": False, "msg": "Flag incorrect."}
    elapsed = int(time.time() - state["start_time"]) if state["start_time"] else 0
    state["flags"][body.step_id] = elapsed
    await broadcast()
    return {"ok": True, "msg": "Flag validé ✓"}

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    clients.append(ws)
    await ws.send_text(json.dumps(build_state()))
    try:
        while True:
            await asyncio.sleep(1)
            if state["running"]:
                await ws.send_text(json.dumps(build_state()))
    except WebSocketDisconnect:
        if ws in clients:
            clients.remove(ws)

app.mount("/", StaticFiles(directory="/app/site", html=True), name="static")
