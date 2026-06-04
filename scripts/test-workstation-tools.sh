#!/usr/bin/env bash
# Teste tous les outils déclarés dans kali-fs.js contre l'API workstation.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/lib/common.sh
source "$ROOT/scripts/lib/common.sh"

WS_PORT="${WORKSTATION_PORT:-18083}"
WS_URL="http://127.0.0.1:${WS_PORT}"
KALI_FS="$ROOT/services/hub/site/assets/js/kali-fs.js"
OUT="${1:-/tmp/workstation-tools-report.txt}"
TIMEOUT_PER_TOOL="${TOOL_TEST_TIMEOUT:-45}"

if ! curl -fsS "$WS_URL/api/health" >/dev/null 2>&1; then
  die "Workstation injoignable sur $WS_URL — lance: docker compose up -d workstation"
fi

log "Test outils workstation — $WS_URL"
log "Rapport → $OUT"

python3 - "$KALI_FS" "$WS_URL" "$OUT" "$TIMEOUT_PER_TOOL" <<'PY'
import json, re, sys, urllib.request, urllib.error

kali_fs, ws_url, out_path, timeout_s = sys.argv[1:5]
timeout_s = int(timeout_s)
text = open(kali_fs, encoding="utf-8").read()
# Extraire noms entre guillemets dans blocs tools: [ ... ]
tools = set()
for block in re.finditer(r"tools:\s*\[([\s\S]*?)\]", text):
    for m in re.finditer(r'"([a-z][a-z0-9._-]*)"', block.group(1)):
        name = m.group(1)
        if name not in ("tools", "label"):
            tools.add(name)
tools = sorted(tools)

ok_exec = []
missing = []
errors = []
timeouts = []

def run_tool(name):
    body = json.dumps({"tool": name, "args": ["--help"], "session": "test"}).encode()
    req = urllib.request.Request(
        f"{ws_url}/api/v1/run",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return {"_http_error": e.code, "_body": e.read().decode()[:500]}
    except Exception as e:
        return {"_error": str(e)}

for i, tool in enumerate(tools, 1):
    print(f"[{i}/{len(tools)}] {tool} ...", flush=True)
    data = run_tool(tool)
    if "_error" in data:
        if "timed out" in data["_error"].lower():
            timeouts.append(tool)
        else:
            errors.append((tool, data["_error"]))
        continue
    if "_http_error" in data:
        errors.append((tool, f"HTTP {data['_http_error']}"))
        continue
    if data.get("fallback") or not data.get("executed"):
        missing.append((tool, data.get("reason") or "fallback"))
    else:
        ok_exec.append(tool)

lines = [
    f"Workstation tool audit — {ws_url}",
    f"Total déclarés (kali-fs.js): {len(tools)}",
    f"OK (binaire exécuté): {len(ok_exec)}",
    f"Absent / fallback: {len(missing)}",
    f"Erreur: {len(errors)}",
    f"Timeout (>{timeout_s}s): {len(timeouts)}",
    "",
    "=== OK ===",
    *ok_exec,
    "",
    "=== ABSENT (simulation côté shell) ===",
]
for t, r in missing:
    lines.append(f"{t}\t{r}")
lines.extend(["", "=== ERREURS ==="])
for t, r in errors:
    lines.append(f"{t}\t{r}")
lines.extend(["", "=== TIMEOUT ==="])
lines.extend(timeouts)

report = "\n".join(lines) + "\n"
open(out_path, "w", encoding="utf-8").write(report)
print(report)
PY

log "Terminé. Détail: $OUT"
