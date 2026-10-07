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
assert.equal(Number(rows.find(r=>r.usage==="onboarding"&&r.status==="published")?.count),50);
assert.equal(Number(rows.find(r=>r.usage==="daily"&&r.status==="published")?.count),29);
const catalog=require("./dist/database/migrations/content/concepts-v2");
const [[categoryCount]]=await db.query("SELECT COUNT(*) AS count FROM category");assert.equal(Number(categoryCount.count),10);
for(const category of catalog.conceptCategoriesV2){
 const [counts]=await db.query("SELECT q.usage, COUNT(*) AS count FROM question q JOIN question_category qc ON qc.questionId=q.id JOIN category c ON c.id=qc.categoryId WHERE c.name=? AND q.status=? AND q.isActive=1 GROUP BY q.usage",[category.name,"published"]);
 assert.equal(Number(counts.find(r=>r.usage==="onboarding")?.count),5);assert.equal(Number(counts.find(r=>r.usage==="daily")?.count),2);
}
for(const question of catalog.conceptQuestionsV2){
 const [[q]]=await db.query("SELECT id,type FROM question WHERE title=?",[question.title]);assert.equal(q.type,question.type);
 const [[answers]]=await db.query("SELECT COUNT(*) AS count FROM answer WHERE questionId=?",[q.id]);assert.equal(Number(answers.count),2);
 const [[followups]]=await db.query("SELECT COUNT(*) AS count FROM followup_answer WHERE questionId=?",[q.id]);assert.equal(Number(followups.count),question.followup?2:0);
}
const [[posts]]=await db.query("SELECT COUNT(*) AS count FROM post WHERE status = ?",["published"]);assert.equal(Number(posts.count),171);
const [[cards]]=await db.query("SELECT COUNT(*) AS count FROM post_segment");assert.equal(Number(cards.count),1930);
const [[illustrated]]=await db.query("SELECT COUNT(*) AS count FROM post_segment WHERE image_key IS NOT NULL AND image_key <> ?",[""]);assert.equal(Number(illustrated.count),1930);
const [perThinker]=await db.query("SELECT philosopher_id, COUNT(*) AS count FROM post GROUP BY philosopher_id");assert.equal(perThinker.length,30);assert.equal(perThinker.filter(p=>Number(p.count)===2).length,14);assert.equal(perThinker.filter(p=>Number(p.count)===4).length,4);assert.equal(perThinker.filter(p=>Number(p.count)===5).length,4);assert.equal(perThinker.filter(p=>Number(p.count)===7).length,1);assert.equal(perThinker.filter(p=>Number(p.count)===22).length,1);
for(const [name,count] of [["북유럽 신화",18],["그리스·로마 신화",15]]){
 const [[profile]]=await db.query("SELECT id FROM philosopher WHERE name=?",[name]);assert.ok(profile);
 const [categories]=await db.query("SELECT category FROM learning_profile_category WHERE philosopher_id=?",[profile.id]);assert.deepEqual(categories,[{category:"mythology"}]);
 const [batch]=await db.query("SELECT id,status FROM post WHERE philosopher_id=?",[profile.id]);assert.equal(batch.length,count);assert.ok(batch.every(p=>p.status==="published"));
 for(const post of batch){const [slides]=await db.query("SELECT image_key FROM post_segment WHERE post_id=?",[post.id]);assert.equal(slides.length,14);assert.equal(new Set(slides.map(s=>s.image_key)).size,14);}
}
const [[camus]]=await db.query("SELECT COUNT(*) AS count FROM post p JOIN philosopher t ON t.id=p.philosopher_id WHERE t.name=? AND p.status=?",["알베르 카뮈","published"]);assert.equal(Number(camus.count),7);
const [[confucius]]=await db.query("SELECT COUNT(*) AS count FROM post p JOIN philosopher t ON t.id=p.philosopher_id WHERE t.name=? AND p.status=?",["공자","published"]);assert.equal(Number(confucius.count),22);
for(const name of ["소크라테스","플라톤","에피쿠로스","마르쿠스 아우렐리우스"]){const [[row]]=await db.query("SELECT COUNT(*) AS count FROM post p JOIN philosopher t ON t.id = p.philosopher_id WHERE t.name = ? AND p.status = ?",[name,"published"]);assert.equal(Number(row.count),name==="플라톤"?10:5);}
const [[users]]=await db.query("SELECT COUNT(*) AS count FROM users");assert.equal(Number(users.count),0);
const [[thinkers]]=await db.query("SELECT COUNT(*) AS count FROM philosopher WHERE imageKey IS NOT NULL");assert.equal(Number(thinkers.count),30);
const [[odysseus]]=await db.query("SELECT id, school FROM philosopher WHERE name = ?",["오디세우스"]);assert.equal(odysseus.school,"신화·문학 인물");
const [[newPosts]]=await db.query("SELECT COUNT(*) AS count FROM post WHERE philosopher_id = ?",[odysseus.id]);assert.equal(Number(newPosts.count),5);
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
docker exec "$api" node -e 'fetch("http://127.0.0.1:3000/api/media/learning-v3-harvard.jpg").then(async r=>{if(r.status!==200||!r.headers.get("content-type").startsWith("image/")||!(await r.arrayBuffer()).byteLength)process.exit(1)}).catch(()=>process.exit(1))'
docker exec "$api" node -e 'const {conceptQuestionsV2}=require("./dist/database/migrations/content/concepts-v2");(async()=>{for(const q of conceptQuestionsV2){const r=await fetch("http://127.0.0.1:3000/api/media/"+q.imageKey);if(r.status!==200||!r.headers.get("content-type").startsWith("image/")||!(await r.arrayBuffer()).byteLength)throw Error("Missing concept image: "+q.key)}})().catch(e=>{console.error(e);process.exit(1)})'
docker exec "$api" node -e 'const a=require("./dist/database/migrations/content/norse-series-v12"),b=require("./dist/database/migrations/content/greek-series-v13");(async()=>{for(const image of [...a.norseImagesV12,...b.greekImagesV13]){const r=await fetch("http://127.0.0.1:3000/api/media/"+image.imageKey);if(r.status!==200||!r.headers.get("content-type").startsWith("image/")||!(await r.arrayBuffer()).byteLength)throw Error("Missing mythology image: "+image.imageKey)}})().catch(e=>{console.error(e);process.exit(1)})'

docker stop "$db" >/dev/null
if docker exec "$api" node /app/healthcheck.cjs; then echo 'Health check ignored DB outage' >&2; exit 1; fi
echo 'Fresh install, repeat migration, reviewed content publication, runtime media and DB outage checks passed'
