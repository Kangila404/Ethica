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

# Leave headroom for TrueNAS and the other projects on this shared host.
check_memory() {
  local available_kib
  available_kib=$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)
  [[ "$available_kib" =~ ^[0-9]+$ ]] && (( available_kib >= $1 * 1024 )) || {
    echo "Insufficient available RAM: $(( ${available_kib:-0} / 1024 )) MiB available, need $1 MiB; deployment stopped" >&2
    echo 'This is RAM pressure, not Docker disk cache. No shared services or volumes were removed.' >&2
    free -m >&2
    exit 1
  }
  echo "Available RAM: $((available_kib / 1024)) MiB"
}
check_memory 1024

# A separate interpolation file works with NAS sudo rules allowing only Docker.
printf 'SERVER_IMAGE=%s\n' "$image" > .deploy-image.env
compose() {
  sudo -n docker --config "$PWD/.docker" compose --env-file .env --env-file .deploy-image.env -f docker-compose.prod.yml "$@"
}
api_stopped=0
migration_started=0
recover_before_migration() {
  local result=$?
  if (( result != 0 && api_stopped == 1 && migration_started == 0 )); then
    echo 'Deployment failed before migrations; restoring the previously configured API/backup.' >&2
    sudo -n docker --config "$PWD/.docker" compose --env-file .env -f docker-compose.prod.yml \
      up -d --no-deps --wait --wait-timeout 180 server backup || true
  elif (( result != 0 && migration_started == 1 )); then
    echo 'Migration phase started; do not roll back the image against an unchecked schema. Backup is preserved.' >&2
  fi
  exit "$result"
}
trap recover_before_migration EXIT
compose config --quiet
compose pull
check_memory 1024
compose up -d --wait --wait-timeout 180 mysql
# No API process or scheduler may write while schema migrations are running.
compose stop server backup
api_stopped=1
check_memory 768
compose run --rm --no-deps backup once
migration_started=1
compose run --rm --no-deps migrate
check_memory 768
compose up -d --no-deps --wait --wait-timeout 180 server backup
if grep -q '^SERVER_IMAGE=' .env; then
  sed "s|^SERVER_IMAGE=.*|SERVER_IMAGE=$image|" .env > .env.next
else
  { cat .env; printf '\nSERVER_IMAGE=%s\n' "$image"; } > .env.next
fi
mv .env.next .env
printf 'SERVER_IMAGE=%s\n' "$image" > release.env.tmp
mv release.env.tmp release.env
echo 'Ethica deployment healthy; image recorded in release.env'
# Never prune shared-host images or remove database/media volumes here.
