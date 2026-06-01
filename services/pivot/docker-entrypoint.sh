#!/bin/bash
set -euo pipefail

# SSH (sshd root via sudo — conteneur web sous www-data, Trivy DS-0002).
if [[ -x /usr/sbin/sshd ]]; then
  sudo /usr/sbin/sshd
fi

exec docker-php-entrypoint "$@"
