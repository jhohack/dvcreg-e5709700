FROM node:22-bookworm-slim AS frontend-build

WORKDIR /app

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM php:8.3-cli

ENV PORT=8080 \
    REMBG_COMMAND=rembg \
    REMBG_MODEL=isnet-general-use

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libfreetype6-dev \
        libjpeg62-turbo-dev \
        libpng-dev \
        libwebp-dev \
        libcurl4-openssl-dev \
        libgomp1 \
        python3 \
        python3-pip \
        python3-venv \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j"$(nproc)" gd curl \
    && python3 -m venv /opt/rembg \
    && /opt/rembg/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/rembg/bin/pip install --no-cache-dir "rembg[cpu]" \
    && ln -s /opt/rembg/bin/rembg /usr/local/bin/rembg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=frontend-build /app/dist/ /var/www/html/
COPY api/ /var/www/html/api/
COPY deployment/php-router.php /var/www/html/router.php

RUN chown -R www-data:www-data /var/www/html

EXPOSE 8080

CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-8080} -t /var/www/html /var/www/html/router.php"]
