// Offline editorial exporter: no DB, network, migration or deployment calls.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),directory=path.join(root,'server/content-drafts/irish-v17'),media=path.join(root,'server/content-media');
const read=n=>JSON.parse(fs.readFileSync(path.join(directory,n+'.json'),'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const batchKey='ethica-irish-v17';
const count=k=>[6,14,18,20].includes(Number(k.slice(-2)))?14:12;
function inputs(){return {articles:['gods-arrival','gods-war','ulster-origins','ulster-war','fianna'].flatMap(read),sources:read('sources'),images:read('images'),plan:read('image-plan')};}
function validate(d,checkFiles=true){
 assert.deepEqual(d.articles.map(a=>a.key),Array.from({length:20},(_,n)=>'irish-'+String(n+1).padStart(2,'0')),'ordered 20 articles');
 assert.deepEqual(Object.keys(d.plan),d.articles.map(a=>a.key),'complete image plan');
 const byKey=new Map(d.images.map(i=>[i.key,i])),used=new Set();assert.equal(byKey.size,d.images.length,'unique assets');
 for(const a of d.articles){
  assert(a.title?.length<=255&&a.part&&a.section,a.key+': metadata');assert.equal(a.cards.length,count(a.key),a.key+': body slide count');
  for(const b of a.cards)assert(typeof b==='string'&&b.includes('\n')&&b.length>=70&&b.length<=10000&&!/\ufffd|TODO|TBD/.test(b),a.key+': body');
  assert(a.sourceIds?.length,a.key+': references');for(const id of a.sourceIds)assert(d.sources[id]?.title&&/^https:\/\//.test(d.sources[id].url),a.key+': source '+id);
  assert.equal(d.plan[a.key].length,a.cards.length+2,a.key+': cover/body/credits images');
  const list=d.plan[a.key].map(key=>{assert(byKey.has(key),a.key+': missing image');used.add(key);return byKey.get(key);});
  for(const field of ['key','imageKey','sha256','artworkId'])assert.equal(new Set(list.map(i=>i[field])).size,list.length,a.key+': duplicate '+field);
 }
 assert.equal(used.size,d.images.length,'unused assets');
 for(const i of d.images){
  assert(/^irish-v17-\d{4}\.(jpg|png)$/.test(i.imageKey),'safe asset path');
  assert(i.artworkId&&i.caption&&i.context&&i.creator&&i.changes,'image attribution');
  if(i.kind==='historical'){
   assert(/^https?:\/\//.test(i.sourceUrl)&&/^https?:\/\//.test(i.licenseUrl),'credit URLs');
   assert(/^(Public domain|CC0|CC BY(?:-SA)? (?:2\.0|2\.5|3\.0|4\.0))$/.test(i.license),'license '+i.license);
  }else{
   assert.equal(i.kind,'ai','known image kind');assert.equal(i.license,'AI-generated','AI license label');
   assert(i.caption.includes('AI 생성')&&i.prompt?.length>100&&i.reason&&i.tool==='built-in image_gen','AI disclosure and provenance');
   assert.equal(i.sourceUrl,null,'no invented source for AI');assert.equal(i.licenseUrl,null,'no fabricated historical license');
  }
  assert(/^[a-f0-9]{64}$/.test(i.sha256),'asset SHA');if(checkFiles)assert.equal(hash(path.join(media,i.imageKey)),i.sha256,'asset integrity '+i.imageKey);
 }
}
const reviewNotes=[
 '로컬 초안. DB·NAS·main·CD 미반영. 운영 등록 시 별도 migration·중복 프로필 확인이 필요함.',
 '신화 이야기군·얼스터 이야기군·피온 이야기군을 구분. 여러 중세 문헌과 후대 재화집을 하나의 실제 연대기로 합치지 않음.',
 '폭력·죽음·강요된 혼인 등은 사건 이해에 필요한 범위로 설명하고 노골적인 신체 묘사는 생략.',
 '권한이 확인되는 기존 이미지 우선. 누아다·브레스·루 등 직접 맞는 기존 삽화가 부족한 장면 10개만 AI 생성하고 별도 표시.',
 '한 글 안에서 파일·해시·동일 원작 중복 금지. 글 사이 재사용 허용. 비교 이미지의 다른 인물·사건·시대는 설명에 표시.',
 '자동 검증과 편집 검토는 학술 전문가 감수나 iOS 실기기 검증을 의미하지 않음.'
];
function credit(i,n){return [`${n+1}. ${i.caption}`,`${i.creator} · ${i.license}`,i.context,i.sourceUrl,i.licenseUrl].filter(Boolean).join('\n');}
function exportData(d){
 validate(d);const byKey=new Map(d.images.map(i=>[i.key,i]));
 const posts=d.articles.map(a=>{
  const imgs=d.plan[a.key].map(key=>byKey.get(key));
  const sources=a.sourceIds.map(id=>({id,...d.sources[id],section:a.section}));
  const credits=['더 읽기 · 자료 출처',a.section,...sources.map(s=>`${s.title}\n${s.url}`),'전승을 바탕으로 새로 작성한 한국어 요약입니다. 현대 번역문을 옮긴 글이 아니며, 이본과 후대 재화의 차이는 본문에서 구분했습니다.','이미지 출처',...imgs.map(credit),'관련 장소·유물은 신화의 사건을 촬영한 것이 아닙니다. AI 생성 삽화는 별도 표시했으며 실제 고미술품으로 소개하지 않습니다.'].join('\n\n');
  assert(credits.length<=10000,a.key+': credits length');const bodies=[null,...a.cards,credits];
  return {key:a.key,status:'draft',philosopherKey:'irish-mythology',title:a.title,imageKey:imgs[0].imageKey,segments:imgs.map((i,n)=>({segmentType:n?'text':'image',body:bodies[n],imageKey:i.imageKey})),editorial:{part:a.part,learningGoal:a.title,sources,imageCredits:imgs.map((i,n)=>({...i,context:(n===0?'표지':n===imgs.length-1?'자료·출처':a.cards[n-1].split('\n')[0])+' — '+i.context})),reviewNotes}};
 });return {schemaVersion:1,batchKey,posts};
}
function validateExport(p){
 assert.equal(p.posts.length,20);assert.equal(p.posts.reduce((n,a)=>n+a.segments.length,0),288,'288 slides');
 for(const a of p.posts){assert.equal(a.status,'draft','must remain local draft');assert.equal(a.philosopherKey,'irish-mythology');assert.equal(a.segments.length,count(a.key)+2);assert.equal(a.imageKey,a.segments[0].imageKey);assert.equal(a.segments[0].body,null);assert(a.segments.every(s=>s.imageKey&&['text','image'].includes(s.segmentType)));assert(a.segments.slice(1).every(s=>s.segmentType==='text'&&s.body?.trim()&&s.body.length<=10000));assert(!('id'in a)&&!('philosopherId'in a),'no invented DB identifiers');}
}
function run(){
 const d=inputs(),p=exportData(d);validateExport(p);const cover=d.images.find(i=>i.key===13);
 const catalog={schemaVersion:1,batchKey,categories:[],philosophers:[{key:'irish-mythology',name:'아일랜드 신화',category:'mythology',existing:false,status:'draft',era:'중세 아일랜드 문헌과 후대 구전·재화에 이어진 여러 전승',school:'신화·영웅 서사',summary:'섬에 찾아온 신들, 홀로 길을 지키는 영웅, 젊음의 나라에서 돌아온 이야기꾼.',description:'신들의 도래와 왕권 8편, 쿠 훌린과 얼스터 7편, 피온·피아나·오신 5편으로 읽는 20편의 시리즈입니다. 특정 저자 한 사람의 창작물이나 단일한 역사 연대기가 아닙니다. 여러 전승의 차이와 후대 미술의 해석을 구별해 소개합니다. 왕들의 이야기군 전체를 다루는 총서는 아닙니다.',imageKey:cover.imageKey,imageCredit:cover,registrationNote:'운영 등록 전에 mythology 분류와 기존 프로필을 조회할 것. 로컬 편집 교환 형식이며 API payload나 실행 가능한 migration이 아님.'}]};
 for(const [name,value]of[['posts',p],['catalog',catalog]])fs.writeFileSync(path.join(directory,name+'.json'),JSON.stringify(value,null,2)+'\n');
 const preview=path.join(root,'.local/irish-v17-review');fs.mkdirSync(preview,{recursive:true});
 const sections=p.posts.map(a=>`<section id="${a.key}"><h2>${esc(a.title)}</h2><p>${esc(a.editorial.part)} · ${a.segments.length}장</p><div class="cards">${a.segments.map((s,n)=>{const i=a.editorial.imageCredits[n],last=n===a.segments.length-1;return `<article><img loading="lazy" src="../../server/content-media/${esc(s.imageKey)}" alt="${esc(i.context)}"><small>${n+1}/${a.segments.length} · ${i.kind==='ai'?'AI 생성':esc(i.license)}</small>${last?'<details><summary>더 읽기 · 전체 출처</summary>':''}<p>${esc(n===0?a.title:s.body)}</p>${last?'</details>':''}<details><summary>이미지 설명·출처 보기</summary><p>${esc(i.caption)}<br>${esc(i.context)}<br>${esc(i.creator)}</p>${i.sourceUrl?`<a href="${esc(i.sourceUrl)}">원본 기록</a> · <a href="${esc(i.licenseUrl)}">${esc(i.license)}</a>`:'AI로 생성한 현대 상상 삽화. 고대 작품 아님.'}</details></article>`}).join('')}</div></section>`).join('');
 fs.writeFileSync(path.join(preview,'index.html'),`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>아일랜드 신화 · 20편 로컬 초안</title><style>body{margin:auto;padding:24px;max-width:1450px;background:#18191b;color:#eee;font:17px/1.7 system-ui}a{color:#a7d2ff}nav{columns:2}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}article{background:#27282b;padding:18px;border-radius:12px}img{width:100%;height:280px;object-fit:contain;background:#111}p{white-space:pre-wrap;overflow-wrap:anywhere}small{color:#ccc}h2{margin-top:64px}details{font-size:14px}summary{cursor:pointer}@media(max-width:600px){nav{columns:1}}</style><h1>아일랜드 신화</h1><p>20편 · 288장 · 로컬 초안 / NAS 미반영</p><p>${esc(catalog.philosophers[0].description)}</p><nav>${p.posts.map(a=>`<div><a href="#${a.key}">${esc(a.title)}</a></div>`).join('')}</nav>${sections}</html>`);
 const report=['# 아일랜드 신화 편집 검토','','로컬 콘텐츠 교환용 JSON. API payload나 migration이 아니며 운영 데이터 변경 없음.','20편 / 본문 248장 + 표지 20장 + 출처 20장 = 288장. 일반편 14장, 6·14·18·20편 16장.','',...reviewNotes.map(n=>'- '+n),'','## 이미지와 원전 검토 범위','','- 고전 재화집의 인종론·낡은 역사 가설은 채택하지 않음. 현대 번역문 직접 인용 없음.','- 루의 물매 돌과 Gregory의 창, 데어드레의 초기·후대 결말, 피온의 최후 및 오신의 시간 이본 구분.','- 브레스의 악정은 혼혈 혈통이 아니라 행위로 설명. 강요된 혼인·게이스를 자유로운 동의와 혼동하지 않음.','- 오시안 회화는 맥퍼슨 이후의 수용으로 설명하고 아일랜드 중세 원전과 동일시하지 않음.','- 현대 사진은 개별 CC 조건, 옛 그림은 작가·출판 기록을 확인. 작가 사후 70년이 지나지 않은 Beatrice Elvery 삽화는 후보에서 제외.','- AI 프롬프트·도구·용도는 ai-images.json에 보관. AI 이미지에 공공 영역 라이선스를 붙이지 않음.',''];
 for(const a of p.posts)report.push('## '+a.key+' · '+a.title,'',...a.editorial.sources.map(s=>`- [${s.title}](${s.url}) — ${s.section}`),'',...a.segments.slice(1,-1).map((s,n)=>`${n+1}. ${s.body.split('\n')[0]} — ${a.editorial.imageCredits[n+1].caption}`),'');
 fs.writeFileSync(path.join(directory,'editorial-review.md'),report.join('\n')+'\n');
 console.log(JSON.stringify({articles:20,slides:288,historicalAssets:d.images.filter(i=>i.kind==='historical').length,aiAssets:d.images.filter(i=>i.kind==='ai').length,assetMiB:+(d.images.reduce((n,i)=>n+fs.statSync(path.join(media,i.imageKey)).size,0)/1048576).toFixed(1),preview:path.join(preview,'index.html'),status:'draft; not deployed'}));
}
module.exports={inputs,validate,exportData,validateExport};if(require.main===module)run();
