#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=scripts/lib/common.sh
source "$(dirname "$0")/lib/common.sh"

# lsof seul est insuffisant sur macOS (Docker / services système) : on tente un bind réel.
port_bindable() {
  local port="$1"
  python3 - "$port" <<'PY'
import socket, sys
port = int(sys.argv[1])
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
try:
    s.bind(("0.0.0.0", port))
except OSError:
    sys.exit(1)
finally:
    s.close()
PY
}

port_in_use() {
  local port="$1"
  if ! port_bindable "$port"; then
    return 0
  fi
  if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    return 0
  fi
  if docker ps --format '{{.Ports}}' 2>/dev/null | grep -q "0.0.0.0:${port}->"; then
    return 0
  fi
  return 1
}

check_one() {
  local port="$1" name="$2"
  if port_in_use "$port"; then
    log "Port ${port} (${name}) indisponible pour Docker :"
    if command -v lsof >/dev/null 2>&1; then
      lsof -nP -iTCP:"$port" 2>/dev/null | head -5 || true
    fi
    docker ps --format 'table {{.Names}}\t{{.Ports}}' 2>/dev/null | grep -E ":${port}->|:${port}/" || true
    echo ""
    echo "→ Changez dans .env (recommandé sur Mac) :"
    echo "    HUB_PORT=18080"
    echo "    PIVOT_PORT=18081"
    echo "  puis : make down && make up"
    return 1
  fi
  log "Port ${port} (${name}) disponible."
}

PIVOT_SSH_PORT="${PIVOT_SSH_PORT:-2222}"

failed=0
check_one "$HUB_PORT" "Hub" || failed=1
check_one "$PIVOT_PORT" "Pivot/gateway" || failed=1
check_one "$PIVOT_SSH_PORT" "Pivot SSH" || failed=1

exit "$failed"
