#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=scripts/lib/common.sh
source "$(dirname "$0")/lib/common.sh"

TIMEOUT="${TIMEOUT:-180}"
INTERVAL="${INTERVAL:-5}"

log "Attente des services (timeout ${TIMEOUT}s)…"

deadline=$((SECONDS + TIMEOUT))
expected="$($COMPOSE config --services 2>/dev/null | wc -l | tr -d ' ')"
if [[ -z "$expected" || "$expected" == "0" ]]; then
  expected=7
fi

while (( SECONDS < deadline )); do
  total="$($COMPOSE ps -a -q 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "$total" == "0" ]]; then
    log "Aucun conteneur détecté (docker compose ps vide)."
    $COMPOSE ps -a || true
    $COMPOSE config || true
    die "La stack n'a pas démarré (up a probablement échoué)"
  fi

  exited="$($COMPOSE ps --status exited -q 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "$exited" != "0" ]]; then
    $COMPOSE ps
    die "Un ou plusieurs conteneurs sont arrêtés"
  fi

  running="$($COMPOSE ps --status running -q 2>/dev/null | wc -l | tr -d ' ')"
  # Santé : colonne Health uniquement (évite les faux positifs sur "starting" dans COMMAND)
  bad_health="$($COMPOSE ps --format '{{.Name}} {{.Health}}' 2>/dev/null \
    | awk '$2 != "" && $2 != "healthy" { print $1 " (" $2 ")" }' || true)"
  bad_status="$($COMPOSE ps --format '{{.Name}} {{.Status}}' 2>/dev/null \
    | grep -E '\(unhealthy\)|Restarting' || true)"

  if [[ "$running" -ge "$expected" && -z "$bad_health" && -z "$bad_status" ]]; then
    log "Stack prête ($running services, healthchecks OK)."
    exit 0
  fi

  log "running=$running/$expected health=${bad_health:-OK} status=${bad_status:-OK}"
  sleep "$INTERVAL"
done

$COMPOSE ps
die "Timeout après ${TIMEOUT}s"
