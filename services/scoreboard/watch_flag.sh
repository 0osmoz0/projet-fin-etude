#!/usr/bin/env bash
# =============================================================================
# watch_flag.sh — Surveillance de captures et transmission au scoreboard
# Escape Game Cyber – Projet fin d'études
#
# Rôle :
#   Ce script tourne sur la machine "victime" (ou son hôte Docker).
#   Il surveille un répertoire de files d'attente (/opt/omega/captures/).
#   Quand un fichier JSON y est déposé, il transmet la capture au serveur
#   scoreboard via l'API REST, puis archive le fichier traité.
#
# Format attendu pour chaque fichier JSON de la file :
#   {
#     "team": "TeamA",
#     "flag": "FOOTHOLD: CASE-2194-A"
#   }
#
# Usage :
#   ./watch_flag.sh [OPTIONS]
#
#   Options :
#     -u URL    URL du scoreboard (défaut : http://localhost:8000)
#     -d DIR    Répertoire de captures  (défaut : /opt/omega/captures)
#     -i SEC    Intervalle de polling si inotifywait absent (défaut : 5)
#     -h        Afficher cette aide
#
# Dépendances (optionnelles mais recommandées) :
#   inotify-tools  → pour la surveillance en temps réel (inotifywait)
#   jq             → pour le parsing JSON propre
#   curl           → pour les requêtes HTTP (toujours requis)
#
# Installation rapide des dépendances (Debian/Ubuntu) :
#   apt-get install -y curl jq inotify-tools
# =============================================================================

set -euo pipefail

# ── Valeurs par défaut ────────────────────────────────────────────────────────
SCOREBOARD_URL="http://localhost:8000"
CAPTURE_DIR="/opt/omega/captures"
POLL_INTERVAL=5
DONE_DIR=""   # Défini dynamiquement après que CAPTURE_DIR est connu

# ── Couleurs (désactivées si pas de terminal) ─────────────────────────────────
if [ -t 1 ]; then
  C_GREEN='\033[0;32m'
  C_YELLOW='\033[1;33m'
  C_RED='\033[0;31m'
  C_CYAN='\033[0;36m'
  C_DIM='\033[2m'
  C_RESET='\033[0m'
else
  C_GREEN=''; C_YELLOW=''; C_RED=''; C_CYAN=''; C_DIM=''; C_RESET=''
fi

# ── Helpers de log ────────────────────────────────────────────────────────────
log_info()  { echo -e "${C_CYAN}[INFO ]${C_RESET} $(date '+%T') $*"; }
log_ok()    { echo -e "${C_GREEN}[OK   ]${C_RESET} $(date '+%T') $*"; }
log_warn()  { echo -e "${C_YELLOW}[WARN ]${C_RESET} $(date '+%T') $*"; }
log_err()   { echo -e "${C_RED}[ERR  ]${C_RESET} $(date '+%T') $*" >&2; }
log_dim()   { echo -e "${C_DIM}[DEBUG]${C_RESET} $(date '+%T') $*"; }

# ── Parsing des arguments ─────────────────────────────────────────────────────
usage() {
  grep '^#' "$0" | grep -v '^#!/' | sed 's/^# //' | sed 's/^#//'
  exit 0
}

while getopts ":u:d:i:h" opt; do
  case $opt in
    u) SCOREBOARD_URL="$OPTARG" ;;
    d) CAPTURE_DIR="$OPTARG"    ;;
    i) POLL_INTERVAL="$OPTARG"  ;;
    h) usage                    ;;
    \?) log_err "Option inconnue: -$OPTARG"; exit 1 ;;
    :)  log_err "Argument manquant pour -$OPTARG"; exit 1 ;;
  esac
done

DONE_DIR="${CAPTURE_DIR}/done"

# ── Initialisation ────────────────────────────────────────────────────────────
init() {
  log_info "=== watch_flag.sh démarré ==="
  log_info "Scoreboard URL : ${SCOREBOARD_URL}"
  log_info "Répertoire     : ${CAPTURE_DIR}"

  # Créer les répertoires s'ils n'existent pas
  mkdir -p "${CAPTURE_DIR}" "${DONE_DIR}"
  log_info "Répertoires OK (captures + done)"

  # Vérifier curl (obligatoire)
  if ! command -v curl &>/dev/null; then
    log_err "curl est requis mais introuvable. Installez-le avec : apt-get install curl"
    exit 1
  fi

  # Vérifier jq (optionnel mais fortement recommandé)
  if ! command -v jq &>/dev/null; then
    log_warn "jq non trouvé — parsing JSON basique activé (moins robuste)"
  fi

  # Tester la connectivité avec le scoreboard
  if curl -sf "${SCOREBOARD_URL}/health" -o /dev/null; then
    log_ok "Scoreboard accessible à ${SCOREBOARD_URL}"
  else
    log_warn "Scoreboard non accessible — les captures seront en file d'attente"
  fi
}

# ── Traitement d'un fichier de capture ───────────────────────────────────────
# Argument : chemin complet du fichier JSON
process_file() {
  local filepath="$1"
  local filename
  filename="$(basename "$filepath")"

  # Vérifier que le fichier est bien un .json et non vide
  [[ "$filename" != *.json ]] && return 0
  [ ! -s "$filepath" ] && { log_warn "Fichier vide ignoré : $filename"; return 0; }

  log_info "Traitement : $filename"

  # ── Extraction des champs team et flag ──────────────────────────────────
  local team flag
  if command -v jq &>/dev/null; then
    # Extraction propre via jq
    team=$(jq -r '.team // empty' "$filepath" 2>/dev/null)
    flag=$(jq -r '.flag // empty' "$filepath" 2>/dev/null)
  else
    # Fallback : regex basique (supporte les guillemets simples et doubles)
    team=$(grep -oP '"team"\s*:\s*"\K[^"]+' "$filepath" 2>/dev/null || true)
    flag=$(grep -oP '"flag"\s*:\s*"\K[^"]+' "$filepath" 2>/dev/null || true)
  fi

  # Valider les champs extraits
  if [ -z "$team" ] || [ -z "$flag" ]; then
    log_err "Champs 'team' ou 'flag' manquants dans $filename — fichier ignoré"
    mv "$filepath" "${DONE_DIR}/error_${filename}"
    return 1
  fi

  log_dim "  team=$team | flag=$flag"

  # ── Envoi à l'API du scoreboard ──────────────────────────────────────────
  local http_code response
  response=$(curl -sf \
    -w "\n%{http_code}" \
    -X POST "${SCOREBOARD_URL}/capture" \
    -H "Content-Type: application/json" \
    -d "{\"team\": \"${team}\", \"flag\": \"${flag}\"}" \
    --connect-timeout 5 \
    --max-time 10 \
    2>/dev/null || echo -e "\nCURL_ERROR")

  http_code="${response##*$'\n'}"
  body="${response%$'\n'*}"

  # ── Gestion de la réponse ────────────────────────────────────────────────
  case "$http_code" in
    200)
      local status
      if command -v jq &>/dev/null; then
        status=$(echo "$body" | jq -r '.status // "?"')
        pts=$(echo "$body" | jq -r '.points_earned // 0')
      else
        status=$(echo "$body" | grep -oP '"status"\s*:\s*"\K[^"]+' || echo "?")
        pts="?"
      fi

      if [ "$status" = "ok" ]; then
        log_ok "Capture enregistrée : team=${team} | flag=${flag%:*} | +${pts} pts"
      elif [ "$status" = "already_captured" ]; then
        log_warn "Doublon ignoré : team=${team} a déjà capturé ce flag"
      else
        log_warn "Réponse inattendue : status=$status"
      fi
      ;;
    400)
      log_err "Flag invalide ou données incorrectes (HTTP 400) — $filename archivé en erreur"
      mv "$filepath" "${DONE_DIR}/error_${filename}"
      return 1
      ;;
    CURL_ERROR)
      log_err "Impossible de joindre ${SCOREBOARD_URL} — fichier conservé pour retry"
      return 1
      ;;
    *)
      log_err "Réponse inattendue du serveur (HTTP $http_code)"
      ;;
  esac

  # Archiver le fichier traité avec un timestamp
  local timestamp
  timestamp=$(date '+%Y%m%d_%H%M%S')
  mv "$filepath" "${DONE_DIR}/${timestamp}_${filename}"
  log_dim "  Archivé dans done/${timestamp}_${filename}"
}

# ── Traitement de tous les fichiers déjà présents ────────────────────────────
process_existing() {
  local count=0
  for f in "${CAPTURE_DIR}"/*.json; do
    [ -f "$f" ] || continue
    process_file "$f" && count=$((count + 1))
  done
  [ "$count" -gt 0 ] && log_info "${count} fichier(s) en attente traité(s)"
}

# ── Boucle principale ─────────────────────────────────────────────────────────
main() {
  init
  process_existing

  if command -v inotifywait &>/dev/null; then
    # ── Mode inotify : réactif, pas de polling ───────────────────────────────
    log_info "Mode inotify actif — surveillance en temps réel"
    inotifywait -m -q \
      --event close_write \
      --format '%w%f' \
      "${CAPTURE_DIR}" |
    while IFS= read -r filepath; do
      process_file "$filepath" || true
    done
  else
    # ── Mode polling : vérifie le dossier toutes les N secondes ─────────────
    log_warn "inotifywait non disponible — polling toutes les ${POLL_INTERVAL}s"
    log_warn "Installez inotify-tools pour un mode réactif : apt-get install inotify-tools"
    while true; do
      process_existing
      sleep "$POLL_INTERVAL"
    done
  fi
}

# ── Piège SIGINT/SIGTERM pour arrêt propre ────────────────────────────────────
trap 'log_info "Arrêt du watcher (signal reçu)."; exit 0' INT TERM

main
