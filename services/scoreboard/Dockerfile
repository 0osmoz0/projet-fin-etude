# =============================================================================
# Dockerfile – Scoreboard OMEGA (FastAPI + WebSocket)
# Escape Game Cyber – Projet fin d'études
# =============================================================================

# Image de base légère Python 3.12
FROM python:3.12-slim

# Métadonnées
LABEL maintainer="Bilal"
LABEL description="Scoreboard temps réel – FastAPI + WebSocket"

# Répertoire de travail dans le container
WORKDIR /app

# ── Dépendances ──────────────────────────────────────────────────────────────
# On copie d'abord uniquement requirements.txt pour profiter du cache Docker :
# si le code change mais pas les dépendances, cette couche n'est pas reconstruite.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Code applicatif ──────────────────────────────────────────────────────────
COPY server.py .
COPY site/ site/

# ── Port exposé ──────────────────────────────────────────────────────────────
EXPOSE 8000

# ── Healthcheck ──────────────────────────────────────────────────────────────
# Docker Compose (et orchestrateurs) utilisent ce check pour savoir si
# le service est prêt avant de router du trafic vers lui.
HEALTHCHECK --interval=10s --timeout=3s --retries=5 --start-period=5s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" \
  || exit 1

# ── Démarrage ────────────────────────────────────────────────────────────────
# --workers 1 : un seul processus pour conserver l'état en mémoire partagé
# (avec plusieurs workers, chaque processus aurait son propre état)
CMD ["uvicorn", "server:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1"]
