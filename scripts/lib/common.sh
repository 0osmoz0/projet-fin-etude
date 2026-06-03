#!/usr/bin/env bash
# Bibliothèque partagée pour les scripts DevOps.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

# Charge .env sans écraser les variables déjà définies (ex. GitHub Actions CI).
load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  local line key val
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "${line// }" ]] && continue
    key="${line%%=*}"
    key="${key#"${key%%[![:space:]]*}"}"
    key="${key%"${key##*[![:space:]]}"}"
    val="${line#*=}"
    val="${val#"${val%%[![:space:]]*}"}"
    val="${val%"${val##*[![:space:]]}"}"
    val="${val%\"}"
    val="${val#\"}"
    if [[ -n "$key" && -z "${!key+x}" ]]; then
      export "$key=$val"
    fi
  done < "$file"
}

load_env_file "$ROOT_DIR/.env"

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
