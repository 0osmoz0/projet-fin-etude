#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=scripts/lib/common.sh
source "$(dirname "$0")/lib/common.sh"

HTTP_TIMEOUT="${HTTP_TIMEOUT:-15}"
PIVOT_SSH_PORT="${PIVOT_SSH_PORT:-2222}"
cctv_path='/api/export.php?id=int-cam3-offline&scope=legacy&as=ops'

log "Smoke SSH — pivot ops → CCTV (port ${PIVOT_SSH_PORT})"

if ! command -v ssh >/dev/null; then
  die "ssh introuvable (requis pour smoke-ssh)"
fi

key_file="$(mktemp)"
trap 'rm -f "$key_file"' EXIT

$COMPOSE exec -T pivot cat /opt/omega/ops/ssh/id_ops.leak >"$key_file"
chmod 600 "$key_file"

ssh_opts=(
  -i "$key_file"
  -p "$PIVOT_SSH_PORT"
  -o BatchMode=yes
  -o StrictHostKeyChecking=no
  -o UserKnownHostsFile=/dev/null
  -o ConnectTimeout="$HTTP_TIMEOUT"
)

body="$(ssh "${ssh_opts[@]}" ops@127.0.0.1 \
  "curl -fsS 'http://cctv:8080${cctv_path}'" 2>/dev/null || true)"

if ! grep -q 'CCTV: BLINDSPOT-OK-' <<<"$body"; then
  die "CCTV via SSH: flag absent (ops@pivot → curl cctv)"
fi
log "OK CCTV (voie SSH ops → réseau interne)"

log "Smoke SSH réussi."
