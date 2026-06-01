#!/bin/bash
set -euo pipefail

# SSH pour la voie pivot (port 22 interne, mappé sur l'hôte via compose).
if [[ -x /usr/sbin/sshd ]]; then
  /usr/sbin/sshd
fi

exec docker-php-entrypoint "$@"
