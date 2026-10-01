#!/usr/bin/env bash
# NAS user cron: 17 3,15 * * * bash /path/to/ethica/infra/renew-tls.sh
set -Eeuo pipefail
cd -- "$(dirname -- "$0")/.."
exec 9>.tls-renew.lock
flock -n 9 || exit 0
sudo -n docker exec edge-certbot-renew certbot renew --cert-name ethica.kro.kr \
  --webroot --webroot-path /var/www/certbot --quiet
sudo -n docker exec edge-nginx nginx -t
sudo -n docker exec edge-nginx nginx -s reload
