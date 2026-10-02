#!/usr/bin/env bash
# Disposable integration check: no host ports, production data or external API calls.
set -Eeuo pipefail
image="${1:?Usage: bash infra/smoke.sh IMAGE}"
prefix="ethica-verify-${GITHUB_RUN_ID:-local}-$$"
network="$prefix"
db="$prefix-mysql"
api="$prefix-api"
cleanup() {
  docker rm -fv "$api" "$db" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT
docker network create "$network" >/dev/null
docker run -d --name "$db" --network "$network" --network-alias mysql \
  --memory=640m --memory-swap=640m \
  -e MYSQL_ROOT_PASSWORD=verification-only -e MYSQL_DATABASE=ethica_verify_deploy \
  mysql:8.0 --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci >/dev/null
ready=0
for ((i=0; i<90; i++)); do
  if docker exec -e MYSQL_PWD=verification-only "$db" mysql --protocol=TCP -h 127.0.0.1 -u root ethica_verify_deploy -Nse 'SELECT 1' >/dev/null 2>&1; then ready=1; break; fi
  sleep 2
done
[[ "$ready" == 1 ]] || { echo 'Verification MySQL did not start' >&2; exit 1; }
env_args=(-e NODE_ENV=production -e DB_SYNCHRONIZE=false -e DB_HOST=mysql -e DB_PORT=3306 -e DB_USERNAME=root -e DB_PASSWORD=verification-only -e DB_DATABASE=ethica_verify_deploy -e JWT_SECRET=verification-only -e SOCIAL_TOKEN_ENCRYPTION_KEY=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)
docker run --rm --memory=256m --memory-swap=256m -e NODE_OPTIONS=--max-old-space-size=160 --network "$network" "${env_args[@]}" "$image" node dist/database/migrate.js
result="$(docker run --rm --memory=256m --memory-swap=256m -e NODE_OPTIONS=--max-old-space-size=160 --network "$network" "${env_args[@]}" "$image" node dist/database/migrate.js)"
[[ "$result" == *'Applied 0 migration(s)'* ]]
docker run --rm --network "$network" "${env_args[@]}" "$image" node -e '
const assert=require("node:assert/strict");
(async()=>{const db=await require("mysql2/promise").createConnection({host:"mysql",user:"root",password:"verification-only",database:"ethica_verify_deploy"});
try {const [rows]=await db.query("SELECT `usage`, status, COUNT(*) AS count FROM question GROUP BY `usage`, status");
assert.equal(Number(rows.find(r=>r.usage==="onboarding"&&r.status==="published")?.count),15);
assert.equal(Number(rows.find(r=>r.usage==="daily"&&r.status==="published")?.count),15);
const [[posts]]=await db.query("SELECT COUNT(*) AS count FROM post WHERE status = ?",["published"]);assert.equal(Number(posts.count),10);
const [[cards]]=await db.query("SELECT COUNT(*) AS count FROM post_segment");assert.equal(Number(cards.count),80);
const [perThinker]=await db.query("SELECT philosopher_id, COUNT(*) AS count FROM post GROUP BY philosopher_id");assert.equal(perThinker.length,5);assert.ok(perThinker.every(p=>Number(p.count)===2));
const [[users]]=await db.query("SELECT COUNT(*) AS count FROM users");assert.equal(Number(users.count),0);
const [[thinkers]]=await db.query("SELECT COUNT(*) AS count FROM philosopher WHERE imageKey IS NOT NULL");assert.equal(Number(thinkers.count),28);
const [[odysseus]]=await db.query("SELECT id, school FROM philosopher WHERE name = ?",["오디세우스"]);assert.equal(odysseus.school,"신화·문학 인물");
const [[newPosts]]=await db.query("SELECT COUNT(*) AS count FROM post WHERE philosopher_id = ?",[odysseus.id]);assert.equal(Number(newPosts.count),0);
}finally{await db.end();}})().catch(e=>{console.error(e);process.exit(1)});'
docker run -d --name "$api" --memory=384m --memory-swap=384m -e NODE_OPTIONS=--max-old-space-size=160 --network "$network" "${env_args[@]}" --read-only --tmpfs /tmp:size=32m,mode=1777 "$image" >/dev/null
ready=0
for ((i=0; i<60; i++)); do
  if [[ "$(docker inspect --format '{{.State.Health.Status}}' "$api")" == healthy ]]; then ready=1; break; fi
  sleep 2
done
[[ "$ready" == 1 ]] || { docker logs "$api"; exit 1; }
docker exec "$api" node -e 'fetch("http://127.0.0.1:3000/api/media/editorial-v1-accuracy.jpg").then(async r=>{if(r.status!==200||!(await r.arrayBuffer()).byteLength)process.exit(1)}).catch(()=>process.exit(1))'
docker exec "$api" node -e 'fetch("http://127.0.0.1:3000/api/media/thinker-v1-odysseus.jpg").then(async r=>{if(r.status!==200||!r.headers.get("content-type").startsWith("image/")||!(await r.arrayBuffer()).byteLength)process.exit(1)}).catch(()=>process.exit(1))'
docker stop "$db" >/dev/null
if docker exec "$api" node /app/healthcheck.cjs; then echo 'Health check ignored DB outage' >&2; exit 1; fi
echo 'Fresh install, repeat migration, reviewed content publication, runtime media and DB outage checks passed'
