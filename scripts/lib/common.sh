#!/usr/bin/env bash
# Bibliothèque partagée pour les scripts DevOps.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${PROJECT_NAME:=pfe-escape}"
: "${HUB_PORT:=8080}"
: "${PIVOT_PORT:=8081}"
: "${COMPOSE:=docker compose}"

log() {
  printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*"
}

die() {
  log "ERREUR: $*"
  exit 1
}
