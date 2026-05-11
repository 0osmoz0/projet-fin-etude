# server.py — Scoreboard temps réel (FastAPI + WebSocket)
# Escape Game Cyber — ESIEE-IT

import json, re
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ── Flags attendus + points ────────────────────────────────────────────────
FLAGS = {
    "FOOTHOLD":  { "pattern": r"^FOOTHOLD:\s*CASE-2194-A$",                     "points": 100 },
    "ELEVATION": { "pattern": r"^ELEVATION:\s*OPS-CLEARANCE-2$",                "points": 200 },
    "CCTV":      { "pattern": r"^CCTV:\s*BLINDSPOT-OK-\d+$",                    "points": 300 },
    "OMEGA":     { "pattern": r"^OMEGA:\s*DOSSIER-OMEGA-SHA256=[a-f0-9]{64}$",  "points": 500 },
}
SPEED_BONUS = 50  # Points bonus pour la première équipe à capturer un flag

# ── Données en mémoire ────────────────────────────────────────────────────
equipes    = {}  # { "TeamA": { "score": 0, "captures": [] } }
historique = []  # toutes les captures
premiers   = {}  # { "FOOTHOLD": "TeamA" }

# ── Gestionnaire WebSocket ────────────────────────────────────────────────
class WSManager:
    def __init__(self):
        self.clients = []

    async def connect(self, ws):
        await ws.accept()
        self.clients.append(ws)

    def disconnect(self, ws):
        self.clients.remove(ws) if ws in self.clients else None

    async def broadcast(self, data):
        morts = []
        for ws in self.clients:
            try:    await ws.send_text(json.dumps(data))
            except: morts.append(ws)
        for ws in morts: self.disconnect(ws)

ws_manager = WSManager()

# ── Modèle de données attendu ─────────────────────────────────────────────
class Soumission(BaseModel):
    team: str
    flag: str

# ── Fonctions utilitaires ─────────────────────────────────────────────────
def check_flag(valeur):
    """Retourne l'id du flag si valide, sinon None."""
    for fid, meta in FLAGS.items():
        if re.match(meta["pattern"], valeur.strip(), re.IGNORECASE):
            return fid
    return None

def classement():
    """Retourne les équipes triées par score décroissant."""
    return sorted(
        [{"team": n, "score": d["score"], "captures": d["captures"]} for n, d in equipes.items()],
        key=lambda x: x["score"], reverse=True
    )

def flags_info():
    return {fid: {"points": m["points"]} for fid, m in FLAGS.items()}

# ── Application ───────────────────────────────────────────────────────────
app = FastAPI()

@app.post("/capture")
async def capture(s: Soumission):
    team = s.team.strip()
    if not team:
        raise HTTPException(400, "Nom d'équipe requis")

    flag_id = check_flag(s.flag)
    if not flag_id:
        raise HTTPException(400, "Flag invalide")

    if team not in equipes:
        equipes[team] = {"score": 0, "captures": []}

    # Doublon : l'équipe a déjà soumis ce flag
    if any(c["flag_id"] == flag_id and c["team"] == team for c in historique):
        return JSONResponse({"status": "already_captured", "flag_id": flag_id})

    bonus = SPEED_BONUS if flag_id not in premiers else 0
    if flag_id not in premiers:
        premiers[flag_id] = team

    total = FLAGS[flag_id]["points"] + bonus
    equipes[team]["score"] += total

    entree = {
        "team": team, "flag_id": flag_id,
        "points": FLAGS[flag_id]["points"], "speed_bonus": bonus,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    historique.append(entree)
    equipes[team]["captures"].append(entree)

    await ws_manager.broadcast({"type": "capture", "capture": entree, "scoreboard": classement()})
    return {"status": "ok", "flag_id": flag_id, "points_earned": total, "speed_bonus": bonus}

@app.get("/scores")
def scores():
    return {"scoreboard": classement(), "total_flags": len(FLAGS), "flags_info": flags_info()}

@app.get("/health")
def health():
    return {"status": "ok", "clients": len(ws_manager.clients), "equipes": len(equipes)}

@app.websocket("/ws")
async def websocket(ws: WebSocket):
    await ws_manager.connect(ws)
    await ws.send_text(json.dumps({
        "type": "init", "scoreboard": classement(),
        "total_flags": len(FLAGS), "flags_info": flags_info()
    }))
    try:
        while True: await ws.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)

app.mount("/", StaticFiles(directory="site", html=True), name="static")
