FROM php:8.5-apache

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssh-server curl sudo \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /var/run/sshd /opt/omega/proofs /opt/omega/ops/ssh \
  && useradd -m -s /bin/bash ops \
  && sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config \
  && sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config

COPY ./site/ /var/www/html/
COPY ./lab-fs/ /
COPY docker-entrypoint.sh /usr/local/bin/pivot-entrypoint.sh

RUN chmod +x /usr/local/bin/pivot-entrypoint.sh \
  && chmod +x /home/ops/scripts/preflight-internal.sh \
  && a2enmod rewrite \
  && sed -i 's/^Listen 80$/Listen 8080/' /etc/apache2/ports.conf \
  && sed -i 's/<VirtualHost \\*:80>/<VirtualHost *:8080>/g' /etc/apache2/sites-available/000-default.conf \
  && printf '%s\n' 'FOOTHOLD: CASE-2194-A' > /opt/omega/proofs/FOOTHOLD.txt \
  && printf '%s\n' 'ELEVATION: OPS-CLEARANCE-2' > /opt/omega/proofs/ELEVATION.txt \
  && mkdir -p /var/www/html/internal/auth-gateway/v2/omega/proofs \
  /var/www/html/internal/auth-gateway/v2/omega/logs \
  /var/www/html/internal/auth-gateway/v2/omega/ops \
  /var/www/html/uploads/staging \
  && ln -sf /opt/omega/proofs/FOOTHOLD.txt /var/www/html/internal/auth-gateway/v2/omega/proofs/foothold.txt \
  && cp /var/www/html/internal/auth-gateway/v2/render.log.seed /var/www/html/internal/auth-gateway/v2/render.log \
  && ln -sf /var/www/html/internal/auth-gateway/v2/render.log /var/www/html/internal/auth-gateway/v2/omega/logs/audit.txt \
  && ssh-keygen -t ed25519 -N "" -f /opt/omega/ops/ssh/id_ops -C "ops@pivot" \
  && install -d -m 700 -o ops -g ops /home/ops/.ssh \
  && install -m 600 -o ops -g ops /opt/omega/ops/ssh/id_ops.pub /home/ops/.ssh/authorized_keys \
  && cp /opt/omega/ops/ssh/id_ops /opt/omega/ops/ssh/id_ops.leak \
  && chmod 644 /opt/omega/ops/ssh/id_ops.leak \
  && chown -R ops:ops /opt/omega/ops/ssh /home/ops \
  && printf '%s\n' \
    'www-data ALL=(ops) NOPASSWD: /usr/bin/ssh, /usr/bin/curl' \
    'www-data ALL=(root) NOPASSWD: /usr/sbin/sshd' \
    > /etc/sudoers.d/omega-www \
  && chmod 440 /etc/sudoers.d/omega-www \
  && chown -R www-data:www-data /var/www/html /opt/omega/proofs \
  && chown www-data:www-data /var/www/html/internal/auth-gateway/v2/render.log \
  && chown -R ops:ops /home/ops /opt/omega/logs /opt/omega/config /opt/omega/backups /opt/omega/ops/archive \
  && chown -R www-data:www-data /var/www/html/uploads/incoming \
  && chown -R root:root /var/log/blacktide \
  && chmod 755 /var/log/blacktide

ENTRYPOINT ["/usr/local/bin/pivot-entrypoint.sh"]
USER www-data
CMD ["apache2-foreground"]
