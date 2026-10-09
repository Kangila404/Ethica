// Editorial-only, offline exporter. No database, deployment, or network calls.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const directory = path.join(root, 'server/content-drafts/egypt-v15');
const media = path.join(root, 'server/content-media');
const read = name => JSON.parse(fs.readFileSync(path.join(directory, name + '.json'), 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const batchKey = 'ethica-egypt-v15';
function inputs() {
  return { articles: ['creation','sun-order','osiris-family','afterlife'].flatMap(read), sources: read('sources'), images: read('images'), plan: read('image-plan') };
}
function validate(data, checkFiles = true) {
  const { articles, sources, images, plan } = data;
  assert.deepEqual(articles.map(a=>a.key), Array.from({length:18},(_,n)=>'egypt-'+String(n+1).padStart(2,'0')), 'ordered 18 articles');
  assert.deepEqual(Object.keys(plan), articles.map(a=>a.key), 'complete image plan');
  assert.equal(new Set(images.map(i=>i.key)).size, images.length, 'unique asset keys');
  const byKey = new Map(images.map(i=>[i.key,i])), used = new Set();
  for (const a of articles) {
    assert(a.title && a.title.length <= 255 && a.part, a.key+': title/part');
    assert.equal(a.cards.length, 10, a.key+': ten body slides');
    for (const card of a.cards) {
      assert(typeof card==='string' && card.includes('\n') && card.length >= 70 && card.length <= 10000 && !/\ufffd|TODO|TBD|교체 필요/.test(card), a.key+': body');
    }
    assert(a.sources.length, a.key+': references');
    for (const s of a.sources) assert(sources[s.id]?.title && /^https:\/\//.test(sources[s.id].url) && s.section && s.supports, a.key+': source '+s.id);
    assert.equal(plan[a.key].length, 12, a.key+': cover/body/credits images');
    const selected = plan[a.key].map(([key,context])=>{ assert(byKey.has(key) && context && !/교체 필요|TODO/.test(context), a.key+': image'); used.add(key); return byKey.get(key); });
    for(const field of ['key','imageKey','sha256','artworkId']) assert.equal(new Set(selected.map(i=>i[field])).size,12,a.key+': duplicate '+field);
  }
  assert.equal(used.size, images.length, 'no unused assets');
  for (const i of images) {
    assert(/^egypt-v15-\d{4}\.(jpg|png|gif)$/.test(i.imageKey), 'safe asset path');
    assert(i.kind==='historical' && i.artworkId && i.caption && i.creator && i.changes, 'attribution');
    assert(/^https?:\/\//.test(i.sourceUrl) && /^https?:\/\//.test(i.licenseUrl), 'credit URLs');
    assert(/^(Public domain|CC0|CC BY(?:-SA)? (?:2\.0|2\.5|3\.0|4\.0))$/.test(i.license), 'license '+i.license);
    assert(/^[a-f0-9]{64}$/.test(i.sha256), 'asset SHA');
    if(checkFiles) assert.equal(sha(path.join(media,i.imageKey)),i.sha256,'asset integrity: '+i.imageKey);
  }
}
function exportData(data) {
  validate(data);
  const byKey=new Map(data.images.map(i=>[i.key,i]));
  const posts=data.articles.map(a=>{
    const images=data.plan[a.key].map(([key,context])=>({...byKey.get(key),context}));
    const sources=a.sources.map(s=>({...s,...data.sources[s.id]}));
    const credits=['더 읽기 · 자료 출처',...sources.map(s=>`${s.title}\n${s.section}\n${s.url}`),'원전과 유물 설명을 참고해 새로 쓴 한국어 요약입니다. 직접 번역 인용이 아니며, 전승별 차이는 본문에 구별했습니다.','이미지 출처',...images.map((i,n)=>`${n+1}. ${i.caption}\n${i.creator} · ${i.license}\n${i.sourceUrl}\n${i.licenseUrl}`),'모든 이미지: Wikimedia Commons 제공 축소본. 원작 구성·색상 변경 없음. 사진은 신화 사건의 기록 사진이 아니라 관련 유물·도상입니다.'].join('\n\n');
    assert(credits.length<=10000,a.key+': credits length');
    const bodies=[null,...a.cards,credits];
    return {key:a.key,status:'draft',philosopherKey:'egypt',title:a.title,imageKey:images[0].imageKey,segments:images.map((i,n)=>({segmentType:n?'text':'image',body:bodies[n],imageKey:i.imageKey})),editorial:{part:a.part,learningGoal:a.title,sources,imageCredits:images,reviewNotes:['로컬 초안. NAS·DB 등록 및 공개는 별도 승인 후 진행.','이집트 여러 지역·시대의 전승을 하나의 정본 연대기로 합치지 않음.','유혈·성적 장면은 상세 재현하지 않는 선별 요약. 고대 유물의 나체 도상은 일부 포함.','문헌의 장면과 이미지가 직접 일치하지 않는 경우 이미지 맥락에 비교 자료임을 명시.']}};
  });
  return {schemaVersion:1,batchKey,posts};
}
function validateExport(payload) {
  assert.equal(payload.posts.length,18);
  for(const p of payload.posts){
    assert.equal(p.status,'draft','must remain local draft');
    assert.equal(p.philosopherKey,'egypt');
    assert.equal(p.segments.length,12);
    assert.equal(p.imageKey,p.segments[0].imageKey);
    assert.equal(p.segments[0].body,null);
    assert(p.segments.every(s=>s.imageKey && ['image','text'].includes(s.segmentType)));
    assert(p.segments.slice(1).every(s=>s.segmentType==='text' && s.body?.trim() && s.body.length<=10000));
    assert(!('id' in p) && !('philosopherId' in p),'no invented DB identifiers');
  }
}
function run() {
  const data=inputs(),payload=exportData(data); validateExport(payload);
  const cover=data.images.find(i=>i.key===7);
  const catalog={schemaVersion:1,batchKey,categories:[],philosophers:[{key:'egypt',name:'이집트 신화',category:'mythology',existing:false,status:'draft',era:'고대 이집트 · 지역과 시대에 따라 발전한 여러 전승',school:'신화·종교 전승',summary:'끝없는 물에서 떠오른 세계, 죽은 왕의 회복, 밤을 건너 다시 태어나는 태양.',description:'여러 지역의 창조 신학과 오시리스 전승, 장례 문헌을 함께 읽는 18편의 시리즈입니다. 특정 인물 한 명의 창작물이나 단일한 정본이 아니라, 서로 다른 시대의 문헌과 유물에 남은 이야기들을 구별해 소개합니다.',imageKey:cover.imageKey,imageCredit:cover,registrationNote:'미등록 제안 프로필. 배포 전 실제 DB에서 중복 프로필을 조회하고 기존 mythology 분류에 연결할 것. 이 파일은 자동 import나 migration이 아니다.'}]};
  for(const [name,value] of [['posts',payload],['catalog',catalog]]) fs.writeFileSync(path.join(directory,name+'.json'),JSON.stringify(value,null,2)+'\n');
  const preview=path.join(root,'.local/egypt-v15-review');fs.mkdirSync(preview,{recursive:true});
  const sections=payload.posts.map(p=>`<section id="${p.key}"><h2>${esc(p.title)}</h2><div class="cards">${p.segments.map((s,n)=>{const i=p.editorial.imageCredits[n];return `<article><img loading="lazy" src="../../server/content-media/${esc(s.imageKey)}" alt="${esc(i.context)}"><small>${n+1}/12 · ${esc(i.license)}</small>${n===11?'<details><summary>더 읽기 · 전체 출처</summary>':''}<p>${esc(n===0?p.title:s.body)}</p>${n===11?'</details>':''}<details><summary>이미지 설명·출처 보기</summary><p>${esc(i.context)}</p><p>${esc(i.caption)}<br>${esc(i.creator)}</p><a href="${esc(i.sourceUrl)}">원본 기록</a> · <a href="${esc(i.licenseUrl)}">${esc(i.license)}</a></details></article>`}).join('')}</div></section>`).join('');
  fs.writeFileSync(path.join(preview,'index.html'),`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>이집트 신화 18편 · 로컬 초안</title><style>body{margin:auto;padding:24px;max-width:1450px;background:#18191b;color:#eee;font:17px/1.7 system-ui}a{color:#a7d2ff}nav{columns:2}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}article{background:#27282b;padding:18px;border-radius:12px}img{width:100%;height:280px;object-fit:contain;background:#111}p{white-space:pre-wrap;overflow-wrap:anywhere}small{color:#ccc}h2{margin-top:64px}details{font-size:14px}summary{cursor:pointer}@media(max-width:600px){nav{columns:1}}</style><h1>이집트 신화</h1><p>18편 · 216장 · 로컬 초안 / NAS 미반영</p><p>${esc(catalog.philosophers[0].description)}</p><nav>${payload.posts.map(p=>`<div><a href="#${p.key}">${esc(p.title)}</a></div>`).join('')}</nav>${sections}</html>`);
  const report=['# 이집트 신화 18편 편집 검수','','로컬 콘텐츠 교환용 JSON. NAS/DB/main/CD 변경 없음. 프로필은 미등록 제안이며 운영 ID를 생성하지 않았다.','표지 1 + 본문 10 + 출처 1 = 글당 12장, 총 216장. 모든 장에 관련 이미지와 저작자·라이선스·원본 링크가 있다.','한 글 안에서 파일·해시·원작 중복 금지. 다른 글 사이의 재사용은 허용. 실제 사진이 없는 사건에는 관련 유물임을 이미지 설명에 표시.','주의: 신화적 폭력·죽음·술과 일부 고대 나체 도상 포함. 치료 주문을 현대 의학이나 실제 효능으로 제시하지 않음.','검수 구분: 실제 유물의 시각 확인과 파일 무결성 검사는 가능하지만 앱 UI 실기기 검수와 학술 전문가 감수는 별도.','다음 등록 단계: 운영 중복 프로필 확인 → 새 migration 추가 → 기존 콘텐츠 유지 → 승인된 CI/CD로만 배포. 현재는 금지.',''];
  for(const p of payload.posts)report.push('## '+p.key+' · '+p.title,'',...p.editorial.sources.map(s=>`- [${s.title}](${s.url}) — ${s.section}: ${s.supports}`),'',...p.segments.slice(1,-1).map((s,n)=>`${n+1}. ${s.body.split('\n')[0]} — ${p.editorial.imageCredits[n+1].context}`),'');
  fs.writeFileSync(path.join(directory,'editorial-review.md'),report.join('\n')+'\n');
  console.log(JSON.stringify({articles:18,slides:216,historicalAssets:data.images.length,assetMiB:+(data.images.reduce((n,i)=>n+fs.statSync(path.join(media,i.imageKey)).size,0)/1048576).toFixed(1),preview:path.join(preview,'index.html'),status:'draft; not deployed'}));
}
module.exports={inputs,validate,exportData,validateExport};
if(require.main===module)run();
