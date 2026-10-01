#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
cd -- "$(dirname -- "$0")/.."
image="${1:?Usage: bash infra/deploy.sh IMAGE}"
[[ "$image" =~ ^[a-z0-9][a-z0-9._/:@-]+$ ]] || { echo 'Invalid image reference' >&2; exit 1; }
test -s .env
test -s server.env
exec 9>.deploy.lock
flock -n 9 || { echo 'Another Ethica deployment is running' >&2; exit 1; }

# A separate interpolation file works with NAS sudo rules allowing only Docker.
printf 'SERVER_IMAGE=%s\n' "$image" > .deploy-image.env
compose() {
  sudo -n docker --config "$PWD/.docker" compose --env-file .env --env-file .deploy-image.env -f docker-compose.prod.yml "$@"
}
compose config --quiet
compose pull
compose up -d --wait --wait-timeout 180 mysql
# No API process or scheduler may write while schema migrations are running.
compose stop server backup
compose run --rm --no-deps backup once
compose run --rm --no-deps migrate
compose up -d --no-deps --wait --wait-timeout 180 server backup
printf 'SERVER_IMAGE=%s\n' "$image" > release.env.tmp
mv release.env.tmp release.env
echo 'Ethica deployment healthy; image recorded in release.env'
# Never prune shared-host images or remove database/media volumes here.
