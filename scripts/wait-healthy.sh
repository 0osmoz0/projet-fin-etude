#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=lib/common.sh
source "$(dirname "$0")/lib/common.sh"

TIMEOUT="${TIMEOUT:-180}"
INTERVAL="${INTERVAL:-5}"

log "Attente des services (timeout ${TIMEOUT}s)…"

deadline=$((SECONDS + TIMEOUT))
expected=7

while (( SECONDS < deadline )); do
  exited="$($COMPOSE ps --status exited -q 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "$exited" != "0" ]]; then
    log "Conteneur(s) arrêté(s) — voir: docker compose ps"
    $COMPOSE ps
    die "Un ou plusieurs services sont en échec"
  fi

  bad="$($COMPOSE ps 2>/dev/null | grep -E 'unhealthy|starting|restarting' || true)"
  running="$($COMPOSE ps --status running -q 2>/dev/null | wc -l | tr -d ' ')"

  if [[ -z "$bad" && "$running" -ge "$expected" ]]; then
    log "Stack prête ($running services running)."
    exit 0
  fi

  log "running=$running/$expected — $(echo "$bad" | head -1 | cut -c1-80)"
  sleep "$INTERVAL"
done

$COMPOSE ps
die "Timeout après ${TIMEOUT}s"
