#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=lib/common.sh
source "$(dirname "$0")/lib/common.sh"

HTTP_TIMEOUT="${HTTP_TIMEOUT:-10}"
CURL_OPTS=(-fsS --max-time "$HTTP_TIMEOUT" -o /dev/null -w '%{http_code}')

check_url() {
  local name="$1" url="$2" expect="${3:-200}"
  local code
  code="$(curl "${CURL_OPTS[@]}" "$url" || echo "000")"
  if [[ "$code" != "$expect" ]]; then
    die "$name: $url → HTTP $code (attendu $expect)"
  fi
  log "OK $name ($url → $code)"
}

log "Smoke tests — $PROJECT_NAME"

check_url "Hub" "http://127.0.0.1:${HUB_PORT}/"
check_url "Pivot (gateway)" "http://127.0.0.1:${PIVOT_PORT}/"

# Services internes via exec (pas exposés sur l'hôte)
for svc in pivot cctv vault alarm; do
  if $COMPOSE exec -T "$svc" wget -qO- http://localhost/ >/dev/null 2>&1; then
    log "OK interne: $svc"
  else
    die "Service interne inaccessible: $svc"
  fi
done

log "Smoke tests réussis."
