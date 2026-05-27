#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> docker compose config"
docker compose config -q

echo "==> yamllint"
yamllint -c .yamllint.yml docker-compose.yml docker-compose.override.yml.example .github/ 2>/dev/null || yamllint docker-compose.yml

echo "==> hadolint"
for f in services/*/Dockerfile; do
  hadolint -c .hadolint.yaml "$f"
done

echo "==> shellcheck"
shellcheck scripts/*.sh

if command -v actionlint >/dev/null; then
  echo "==> actionlint"
  actionlint
fi

echo "Lint OK."
