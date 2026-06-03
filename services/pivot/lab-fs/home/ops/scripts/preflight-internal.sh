#!/bin/bash
# Black Tide — internal mesh preflight (ops)
set -euo pipefail
echo "[preflight] host=$(hostname) user=$(id -un)"
for svc in cctv alarm vault; do
  code=$(curl -fsS -o /dev/null -w '%{http_code}' "http://${svc}:8080/" 2>/dev/null || echo "000")
  echo "[preflight] ${svc}:8080 -> HTTP ${code}"
done
echo "[preflight] done"
