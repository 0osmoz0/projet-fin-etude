#!/bin/bash
# Black Tide — internal mesh preflight (ops)
set -euo pipefail

DEPLOY_CONSOLES=0
for arg in "$@"; do
  case "$arg" in
    --deploy-consoles) DEPLOY_CONSOLES=1 ;;
  esac
done

echo "[preflight] host=$(hostname) user=$(id -un)"
for svc in cctv alarm vault; do
  code=$(curl -fsS -o /dev/null -w '%{http_code}' "http://${svc}:8080/" 2>/dev/null || echo "000")
  echo "[preflight] ${svc}:8080 -> HTTP ${code}"
done

if [[ "$DEPLOY_CONSOLES" -eq 1 ]]; then
  echo "[preflight] tunnel ops: OK"
  echo "OMEGA-CONSOLE-DEPLOY: BT-OPS-TUNNEL-4421"
  echo "[preflight] coller le jeton dans Liaison pivot sur le poste OMEGA"
fi

echo "[preflight] done"
