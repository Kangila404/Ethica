// Offline editorial exporter. Intentionally has no DB, network, or deployment calls.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),directory=path.join(root,'server/content-drafts/mesopotamia-v16'),media=path.join(root,'server/content-media');
const read=n=>JSON.parse(fs.readFileSync(path.join(directory,n+'.json'),'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const batchKey='ethica-mesopotamia-v16';
const count=k=>[15,17,18,19,20].includes(Number(k.slice(-2)))?14:12;
function inputs(){return {articles:['creation','atrahasis','inanna','gilgamesh-journey','gilgamesh-mortality'].flatMap(read),sources:read('sources'),images:read('images'),plan:read('image-plan')};}
function validate(d,checkFiles=true){
 assert.deepEqual(d.articles.map(a=>a.key),Array.from({length:20},(_,n)=>'meso-'+String(n+1).padStart(2,'0')),'ordered 20 articles');
 assert.deepEqual(Object.keys(d.plan),d.articles.map(a=>a.key),'complete image plan');
 const byKey=new Map(d.images.map(i=>[i.key,i])),used=new Set();assert.equal(byKey.size,d.images.length,'unique assets');
 for(const a of d.articles){
  assert(a.title?.length<=255 && a.part && a.section,a.key+': metadata');assert.equal(a.cards.length,count(a.key),a.key+': body slide count');
  for(const b of a.cards)assert(typeof b==='string'&&b.includes('\n')&&b.length>=70&&b.length<=10000&&!/\ufffd|TODO|TBD/.test(b),a.key+': body');
  assert(a.sourceIds?.length,a.key+': references');for(const id of a.sourceIds)assert(d.sources[id]?.title&&/^https:\/\//.test(d.sources[id].url),a.key+': source '+id);
  assert.equal(d.plan[a.key].length,a.cards.length+2,a.key+': cover/body/credits images');
  const list=d.plan[a.key].map(key=>{assert(byKey.has(key),a.key+': missing image');used.add(key);return byKey.get(key);});
  for(const field of ['key','imageKey','sha256','artworkId'])assert.equal(new Set(list.map(i=>i[field])).size,list.length,a.key+': duplicate '+field);
 }
 assert.equal(used.size,d.images.length,'unused assets');
 for(const i of d.images){
  assert(/^mesopotamia-v16-\d{4}\.(jpg|png|gif)$/.test(i.imageKey),'safe asset path');
  assert(i.kind==='historical'&&i.artworkId&&i.caption&&i.context&&i.creator&&i.changes,'image attribution');
  assert(/^https?:\/\//.test(i.sourceUrl)&&/^https?:\/\//.test(i.licenseUrl),'credit URLs');
  assert(/^(Public domain|CC0|CC BY(?:-SA)? (?:2\.0|2\.5|3\.0|4\.0))$/.test(i.license),'license '+i.license);
  assert(/^[a-f0-9]{64}$/.test(i.sha256),'asset SHA');if(checkFiles)assert.equal(hash(path.join(media,i.imageKey)),i.sha256,'asset integrity '+i.imageKey);
 }
}
function exportData(d){
 validate(d);const byKey=new Map(d.images.map(i=>[i.key,i]));
 const posts=d.articles.map(a=>{
  const imgs=d.plan[a.key].map(key=>byKey.get(key));
  const sources=a.sourceIds.map(id=>({id,...d.sources[id],section:a.section}));
  const credits=['더 읽기 · 자료 출처',a.section,...sources.map(s=>`${s.title}\n${s.url}`),'고대 작품을 바탕으로 새로 작성한 한국어 요약입니다. 현대 번역문을 옮긴 글이 아니며, 서로 다른 전승과 결락은 본문에서 구분했습니다.','이미지 출처',...imgs.map((i,n)=>`${n+1}. ${i.caption}\n${i.creator} · ${i.license}\n${i.sourceUrl}\n${i.licenseUrl}`),'Wikimedia Commons 제공 축소본. 원작 구성·색상 변경 없음. 유물·풍경은 신화의 사건을 촬영한 것이 아니며, 불확실한 인물 식별과 비교 자료의 성격은 개별 이미지 설명에 표시했습니다.'].join('\n\n');
  assert(credits.length<=10000,a.key+': credits length');const bodies=[null,...a.cards,credits];
  return {key:a.key,status:'draft',philosopherKey:'mesopotamia',title:a.title,imageKey:imgs[0].imageKey,segments:imgs.map((i,n)=>({segmentType:n?'text':'image',body:bodies[n],imageKey:i.imageKey})),editorial:{part:a.part,learningGoal:a.title,sources,imageCredits:imgs.map((i,n)=>({...i,context:(n===0?'표지':n===imgs.length-1?'자료·출처':a.cards[n-1].split('\n')[0])+' — '+i.context})),reviewNotes:['로컬 초안. DB·NAS·main·CD 미반영.','수메르어 이난나 전승, 바빌로니아 창조·홍수 서사, 길가메시의 여러 판본을 구분.','폭력·죽음·성적 관계를 다루되 노골적인 세부 묘사 없음. 일부 고대 유물에는 나체 도상이 있음.','이미지 출처·라이선스와 동일 원작 중복을 검사. 학술 전문가 감수나 iOS 실기기 검증을 의미하지 않음.']}};
 });return {schemaVersion:1,batchKey,posts};
}
function validateExport(p){
 assert.equal(p.posts.length,20);assert.equal(p.posts.reduce((n,a)=>n+a.segments.length,0),290,'290 slides');
 for(const a of p.posts){assert.equal(a.status,'draft','must remain local draft');assert.equal(a.philosopherKey,'mesopotamia');assert.equal(a.segments.length,count(a.key)+2);assert.equal(a.imageKey,a.segments[0].imageKey);assert.equal(a.segments[0].body,null);assert(a.segments.every(s=>s.imageKey&&['text','image'].includes(s.segmentType)));assert(a.segments.slice(1).every(s=>s.segmentType==='text'&&s.body?.trim()&&s.body.length<=10000));assert(!('id'in a)&&!('philosopherId'in a),'no invented DB identifiers');}
}
function run(){
 const d=inputs(),p=exportData(d);validateExport(p);const cover=d.images.find(i=>i.key===291);
 const catalog={schemaVersion:1,batchKey,categories:[],philosophers:[{key:'mesopotamia',name:'메소포타미아 신화',category:'mythology',existing:false,status:'draft',era:'고대 메소포타미아 · 수메르어와 아카드어로 이어진 여러 전승',school:'신화·종교·영웅 서사',summary:'세계를 만드는 신들, 저승에서 돌아오는 여신, 죽음을 피하려 길을 떠난 왕.',description:'에누마 엘리시 4편, 아트라하시스 3편, 이난나 4편, 길가메시 9편으로 읽는 20편의 시리즈입니다. 특정 작가 한 명의 작품이나 모든 지역이 공유한 단일 정본이 아닙니다. 전승별 차이와 문헌의 결락을 구별해 소개합니다.',imageKey:cover.imageKey,imageCredit:cover,registrationNote:'로컬 프로필 초안. 운영 등록 전에 기존 mythology 분류와 중복 프로필을 조회하고 migration으로 반영할 것. 이 파일은 API payload나 실행 가능한 migration이 아님.'}]};
 for(const [name,value]of[['posts',p],['catalog',catalog]])fs.writeFileSync(path.join(directory,name+'.json'),JSON.stringify(value,null,2)+'\n');
 const preview=path.join(root,'.local/mesopotamia-v16-review');fs.mkdirSync(preview,{recursive:true});
 const sections=p.posts.map(a=>`<section id="${a.key}"><h2>${esc(a.title)}</h2><p>${esc(a.editorial.part)} · ${a.segments.length}장</p><div class="cards">${a.segments.map((s,n)=>{const i=a.editorial.imageCredits[n],last=n===a.segments.length-1;return `<article><img loading="lazy" src="../../server/content-media/${esc(s.imageKey)}" alt="${esc(i.context)}"><small>${n+1}/${a.segments.length} · ${esc(i.license)}</small>${last?'<details><summary>더 읽기 · 전체 출처</summary>':''}<p>${esc(n===0?a.title:s.body)}</p>${last?'</details>':''}<details><summary>이미지 설명·출처 보기</summary><p>${esc(i.caption)}<br>${esc(i.context)}<br>${esc(i.creator)}</p><a href="${esc(i.sourceUrl)}">원본 기록</a> · <a href="${esc(i.licenseUrl)}">${esc(i.license)}</a></details></article>`}).join('')}</div></section>`).join('');
 fs.writeFileSync(path.join(preview,'index.html'),`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>메소포타미아 신화 · 20편 로컬 초안</title><style>body{margin:auto;padding:24px;max-width:1450px;background:#18191b;color:#eee;font:17px/1.7 system-ui}a{color:#a7d2ff}nav{columns:2}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}article{background:#27282b;padding:18px;border-radius:12px}img{width:100%;height:280px;object-fit:contain;background:#111}p{white-space:pre-wrap;overflow-wrap:anywhere}small{color:#ccc}h2{margin-top:64px}details{font-size:14px}summary{cursor:pointer}@media(max-width:600px){nav{columns:1}}</style><h1>메소포타미아 신화</h1><p>20편 · 290장 · 로컬 초안 / NAS 미반영</p><p>${esc(catalog.philosophers[0].description)}</p><nav>${p.posts.map(a=>`<div><a href="#${a.key}">${esc(a.title)}</a></div>`).join('')}</nav>${sections}</html>`);
 const report=['# 메소포타미아 신화 편집 검토','','로컬 콘텐츠 교환용 JSON. 실행 가능한 migration이나 API payload가 아니다. DB·NAS·main·CD 변경 없음.','20편 / 본문 250장 + 표지 20장 + 출처 20장 = 290장. 일반편 14장, 15·17·18·19·20편 16장.','모든 장에 실제 유물·역사적 삽화·관련 풍경·지도 이미지 및 저작자·라이선스·원본 링크 포함. AI 생성 없음.','한 글 안에서 파일·해시·동일 원작 중복 금지. 글 사이의 재사용은 허용. 불확실한 인물 식별과 비교 이미지는 개별 설명에 표시.','자료 검토 범위: 고대 작품의 사건과 판본 차이, 현대 설명 자료의 교차 확인. 현대 번역문 인용 없이 원문 사건을 한국어로 재구성. 본문의 해석 문장은 편집자의 해석이며 고대 문장의 직접 번역이 아님.','고전 번역의 오래된 역사 가설은 채택하지 않음. ETCSL 결락 표시 유지. 아트라하시스 결말과 우트나피시팀의 불멸을 구분.','출처 메타데이터의 note는 내부 편집 기록이며 앱 본문에 그대로 표시하지 않음.','운영 반영은 사용자 지시 후 별도 migration·중복 프로필 확인·CI/CD를 통해 진행할 것.',''];
 for(const a of p.posts)report.push('## '+a.key+' · '+a.title,'',...a.editorial.sources.map(s=>`- [${s.title}](${s.url}) — ${s.section}`),'',...a.segments.slice(1,-1).map((s,n)=>`${n+1}. ${s.body.split('\n')[0]} — ${a.editorial.imageCredits[n+1].caption}`),'');
 fs.writeFileSync(path.join(directory,'editorial-review.md'),report.join('\n')+'\n');
 console.log(JSON.stringify({articles:20,slides:290,historicalAssets:d.images.length,assetMiB:+(d.images.reduce((n,i)=>n+fs.statSync(path.join(media,i.imageKey)).size,0)/1048576).toFixed(1),preview:path.join(preview,'index.html'),status:'draft; not deployed'}));
}
module.exports={inputs,validate,exportData,validateExport};if(require.main===module)run();
