FROM php:8.2-apache
COPY ./site/ /var/www/html/
RUN a2enmod rewrite \
  && sed -i 's/^Listen 80$/Listen 8080/' /etc/apache2/ports.conf \
  && sed -i 's/<VirtualHost \\*:80>/<VirtualHost *:8080>/g' /etc/apache2/sites-available/000-default.conf \
  && mkdir -p /opt/omega/proofs \
  && printf '%s\n' 'FOOTHOLD: CASE-2194-A' > /opt/omega/proofs/FOOTHOLD.txt \
  && mkdir -p /var/www/html/internal/auth-gateway/v2/omega/proofs \
  && ln -sf /opt/omega/proofs/FOOTHOLD.txt /var/www/html/internal/auth-gateway/v2/omega/proofs/foothold.txt \
  && chown -R www-data:www-data /var/www/html /opt/omega /var/lock/apache2 /var/run/apache2 /var/log/apache2

USER www-data
