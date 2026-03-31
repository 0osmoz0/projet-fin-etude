# Projet-Fin-d-etude

# King of the Hill — Plateforme de Cybersécurité Compétitive

> Projet 2025/2026 — Bachelor Cybersécurité — ESIEE-IT

---

## Contexte

King of the Hill (KoTH) est un jeu compétitif où plusieurs équipes s'affrontent pour prendre et conserver le contrôle d'une machine vulnérable. L'équipe qui maintient son accès le plus longtemps remporte la partie. Le scoreboard est affiché en temps réel sur une interface web.

---

## Architecture



## Stack technique

| Composant | Technologie |


---

## Installation



### 2. VM vulnérable (Ubuntu Server)





## Scénario d'attaque

à noté



Le watcher détecte le changement et notifie le scoreboard automatiquement.

---

## Configuration

### Changer les noms d'équipes

Dans `server.py` :
```python
TEAMS = {
    "team1": {"name": "Team 1", "color": "#FF3B3B"},
    "team2": {"name": "Team 2", "color": "#3BFF8A"},
    "team3": {"name": "Team 3", "color": "#3BB5FF"},
    "team4": {"name": "Team 4", "color": "#FFD93B"},
}
```

Même chose dans `templates/index.html` → `TEAMS_CONFIG`.

### Changer la durée de partie

Dans `server.py` :
```python
GAME_DURATION = 30 * 60  # 30 minutes
```

---

## API

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/capture` | Enregistrer une capture `{"team_id": "team1"}` |
| `POST` | `/api/start` | Démarrer la partie |
| `POST` | `/api/reset` | Reset la partie |
| `GET` | `/api/state` | État JSON courant |
| `WS` | `/ws` | WebSocket temps réel |

---

## Structure du projet

```
koth/
├── server.py            # Backend FastAPI
├── templates/
│   └── index.html       # Scoreboard web
├── watch_flag.sh        # Surveillance flag sur la VM
├── setup_vm.sh          # Script d'installation de la VM victime
├── requirements.txt
└── README.md
```

---


---

*Projet réalisé dans un cadre pédagogique — usage strictement en environnement isolé.*

