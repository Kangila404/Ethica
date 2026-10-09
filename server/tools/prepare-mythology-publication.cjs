// Freeze the user-approved local batches; this never contacts a database.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const batches = ['greek-v14', 'egypt-v15', 'mesopotamia-v16', 'irish-v17'];
const profiles = [], posts = [], assets = [];
for (const batch of batches) {
  const dir = path.join(root, 'content-drafts', batch);
  const read = name => JSON.parse(fs.readFileSync(path.join(dir, name + '.json'), 'utf8'));
  const catalog = read('catalog').philosophers[0];
  const credit = catalog.imageCredit;
  profiles.push({key: catalog.key, name: catalog.name, existing: catalog.existing,
    category: catalog.category, era: catalog.era || '', school: catalog.school || '',
    coreThought: catalog.summary || '', imageKey: catalog.imageKey || '',
    lifeRoots: credit ? [catalog.description, '[프로필 이미지]', credit.caption,
      credit.creator, credit.license, credit.sourceUrl, credit.licenseUrl, credit.changes].filter(Boolean).join('\n\n') : ''});
  const batchPosts = read('posts').posts;
  for (const p of batchPosts) {
    assert.equal(p.status, 'draft');
    posts.push({batch, key:p.key, philosopherKey:p.philosopherKey, title:p.title,
      imageKey:p.imageKey, segments:p.segments});
  }
  const used = new Set([catalog.imageKey, ...batchPosts.flatMap(p=>p.segments.map(s=>s.imageKey))]);
  assets.push(...read('images').filter(i=>used.has(i.imageKey)));
}
assert.equal(posts.length,82);
assert.equal(posts.reduce((n,p)=>n+p.segments.length,0),1082);
const output = path.join(root,'src/database/migrations/content/pending-mythologies-v18.json');
fs.writeFileSync(output, JSON.stringify({approvalDate:'2026-10-09',profiles,posts,assets},null,2)+'\n');
console.log(JSON.stringify({posts:posts.length,assets:assets.length,output}));
