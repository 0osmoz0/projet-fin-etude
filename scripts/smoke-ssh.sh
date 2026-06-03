#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=scripts/lib/common.sh
source "$(dirname "$0")/lib/common.sh"

HTTP_TIMEOUT="${HTTP_TIMEOUT:-15}"
PIVOT_SSH_PORT="${PIVOT_SSH_PORT:-2222}"

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

# URL constante : expansion locale voulue pour la commande curl distante.
# shellcheck disable=SC2029
body="$(ssh "${ssh_opts[@]}" ops@127.0.0.1 \
  "curl -fsS 'http://cctv:8080/api/export.php?id=int-cam3-offline&scope=legacy&as=ops'" \
  2>/dev/null || true)"

if ! grep -q 'CCTV: BLINDSPOT-OK-' <<<"$body"; then
  die "CCTV via SSH: flag absent (ops@pivot → curl cctv)"
fi
log "OK CCTV (voie SSH ops → réseau interne)"

# shellcheck disable=SC2029
alarm="$(ssh "${ssh_opts[@]}" ops@127.0.0.1 \
  "curl -fsS 'http://alarm:8080/api/silence.php?token=BT-ALARM-OPS-4421&window=cam3'" \
  2>/dev/null || true)"
if ! grep -q 'ALERT: SILENCED-BT-4421' <<<"$alarm"; then
  die "Alarm via SSH: flag ALERT absent"
fi
log "OK Alarm (SSH → silence field alerting)"

# shellcheck disable=SC2029
terrain="$(ssh "${ssh_opts[@]}" ops@127.0.0.1 \
  "curl -fsS 'http://cctv:8080/api/export.php?id=int-cam3-plan&token=BT-CCTV-ADMIN-4421&as=admin'" \
  2>/dev/null || true)"
if ! grep -q 'TERRAIN: CAM3-PLAN-EXPORT-' <<<"$terrain"; then
  die "Terrain via SSH: flag absent"
fi
log "OK Terrain (SSH → cctv plan)"

# shellcheck disable=SC2029
omega="$(ssh "${ssh_opts[@]}" ops@127.0.0.1 \
  "curl -fsS 'http://vault:8080/api/dossier.php?token=OMEGA-VAULT-SA-4421'" \
  2>/dev/null || true)"
if ! grep -qE 'OMEGA: DOSSIER-OMEGA-SHA256=[a-f0-9]{64}' <<<"$omega"; then
  die "OMEGA via SSH: flag absent"
fi
log "OK OMEGA (SSH → vault dossier)"

log "Smoke SSH réussi."
