#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=scripts/lib/common.sh
source "$(dirname "$0")/lib/common.sh"

HTTP_TIMEOUT="${HTTP_TIMEOUT:-10}"

check_url() {
  local name="$1" url="$2" expect="${3:-200}"
  local code
  code="$(curl -fsS --max-time "$HTTP_TIMEOUT" -o /dev/null -w '%{http_code}' -L "$url" 2>/dev/null || echo "000")"
  if [[ "$code" != "$expect" ]]; then
    die "$name: $url → HTTP $code (attendu $expect)"
  fi
  log "OK $name ($url → $code)"
}

log "Smoke tests — $PROJECT_NAME"

check_url "Hub" "http://127.0.0.1:${HUB_PORT}/"
check_url "Pivot (gateway)" "http://127.0.0.1:${PIVOT_PORT}/"
check_url "Pivot partner" "http://127.0.0.1:${PIVOT_PORT}/partner.html"
check_url "Pivot auth-gateway health" "http://127.0.0.1:${PIVOT_PORT}/internal/auth-gateway/v2/health.php"

foothold_url="http://127.0.0.1:${PIVOT_PORT}/internal/auth-gateway/v2/render.php?mode=legacy&tpl=omega/proofs/foothold"
foothold_body="$(curl -fsS --max-time "$HTTP_TIMEOUT" "$foothold_url" 2>/dev/null || true)"
if ! grep -q 'FOOTHOLD: CASE-2194-A' <<<"$foothold_body"; then
  die "Foothold: flag attendu absent ($foothold_url)"
fi
log "OK Foothold (legacy artifact channel)"

relay_base="http://127.0.0.1:${PIVOT_PORT}/internal/auth-gateway/v2/ops-relay.php"
relay_jar="$(mktemp)"
trap 'rm -f "$relay_jar"' EXIT

relay_bind="$(curl -fsS --max-time "$HTTP_TIMEOUT" -c "$relay_jar" -b "$relay_jar" \
  "${relay_base}?bind=ops-sess-8842" 2>/dev/null || true)"
if ! grep -q 'RELAY BOUND' <<<"$relay_bind"; then
  die "Elevation: liaison session relay échouée"
fi

relay_up="$(curl -fsS --max-time "$HTTP_TIMEOUT" -c "$relay_jar" -b "$relay_jar" \
  -X POST -d 'action=upgrade&key=1442-HTUA-TB:n.morel' "$relay_base" 2>/dev/null || true)"
if ! grep -q 'clearance=2' <<<"$relay_up"; then
  die "Elevation: upgrade relay échoué"
fi

elevation_body="$(curl -fsS --max-time "$HTTP_TIMEOUT" -c "$relay_jar" -b "$relay_jar" \
  "${relay_base}?action=export&artifact=elevation" 2>/dev/null || true)"
if ! grep -q 'ELEVATION: OPS-CLEARANCE-2' <<<"$elevation_body"; then
  die "Elevation: flag attendu absent (ops-relay export)"
fi
log "OK Elevation (ops-relay clearance 2)"

cctv_path='/api/export.php?id=int-cam3-offline&scope=legacy&as=ops'
relay_mesh="$(curl -fsS --max-time "$HTTP_TIMEOUT" -c "$relay_jar" -b "$relay_jar" \
  -G --data-urlencode 'action=mesh' "$relay_base" 2>/dev/null || true)"
if ! grep -q 'service=cctv' <<<"$relay_mesh"; then
  die "Pivot mesh: inventaire interne absent (action=mesh)"
fi
log "OK Pivot mesh (clearance 2)"

relay_probe="$(curl -fsS --max-time "$HTTP_TIMEOUT" -c "$relay_jar" -b "$relay_jar" \
  -G --data-urlencode 'action=probe' --data-urlencode 'target=cctv' --data-urlencode "path=${cctv_path}" \
  "$relay_base" 2>/dev/null || true)"
if ! grep -q 'CCTV: BLINDSPOT-OK-' <<<"$relay_probe"; then
  die "CCTV: flag attendu absent (ops-relay probe → cctv)"
fi
log "OK CCTV (relay probe voie web)"

# Services internes via exec (pas exposés sur l'hôte)
http_probe() {
  $COMPOSE exec -T "$1" sh -c \
    'curl -fsS http://127.0.0.1:8080/ >/dev/null 2>&1 || curl -fsS http://127.0.0.1/ >/dev/null 2>&1 || wget -qO- http://127.0.0.1:8080/ >/dev/null 2>&1 || wget -qO- http://127.0.0.1/ >/dev/null 2>&1'
}

for svc in pivot cctv vault alarm; do
  if http_probe "$svc"; then
    log "OK interne: $svc"
  else
    die "Service interne inaccessible: $svc"
  fi
done

log "Smoke tests réussis."
