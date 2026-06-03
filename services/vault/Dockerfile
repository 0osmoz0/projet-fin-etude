FROM php:8.2-apache

COPY ./site/ /var/www/html/

RUN sed -i 's/^Listen 80$/Listen 8080/' /etc/apache2/ports.conf \
  && sed -i 's/<VirtualHost \\*:80>/<VirtualHost *:8080>/g' /etc/apache2/sites-available/000-default.conf \
  && chown -R www-data:www-data /var/www/html /var/lock/apache2 /var/run/apache2 /var/log/apache2

USER www-data
