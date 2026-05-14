#!/bin/sh
set -eu

export PORT="${PORT:-8080}"

sed "s/\${PORT}/${PORT}/g" \
    /etc/apache2/sites-available/000-default.conf.template \
    > /etc/apache2/sites-available/000-default.conf

printf 'Listen %s\n' "$PORT" > /etc/apache2/ports.conf

exec apache2-foreground
