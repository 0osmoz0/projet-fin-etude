FROM php:8.2-apache
COPY ./site/ /var/www/html/
RUN a2enmod rewrite && chown -R www-data:www-data /var/www/html/internal/auth-gateway/v2