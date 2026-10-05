// Deterministic, offline HTML rendering. Prints to stdout; never writes files.
const fs = require('node:fs');
const path = require('node:path');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const links = text => escape(text).replace(/https?:\/\/[^\s]+/g, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
function render(posts) {
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ethica 니체 18편 · 로컬 검수</title>
<style>body{background:#f4f0e8;color:#282922;font:16px/1.75 system-ui,sans-serif;margin:0;padding:24px}main{max-width:1250px;margin:auto}h1{font-size:27px}nav{display:flex;flex-wrap:wrap;gap:12px;margin:25px 0}a{color:#36594c}section{scroll-margin:20px;margin:50px 0}h2{font-size:23px;border-bottom:1px solid #bfc3b6;padding-bottom:16px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(290px,100%),1fr));gap:18px}article{background:#fffdf9;border:1px solid #d9dacd;border-radius:14px;overflow:hidden}img{width:100%;height:240px;object-fit:contain;background:#f9f9f5}article>div{padding:18px}p{white-space:pre-line;margin:10px 0}h3{font-size:18px;margin:8px 0}.number{color:#667267;font-size:12px}details{font-size:13px;overflow-wrap:anywhere}summary{cursor:pointer}aside{padding:16px;border-left:4px solid #627e60;background:#e7ece0}footer{font-size:13px;margin:40px 0}</style></head>
<body><main><h1>니체 읽기 · 18편 / 324장</h1><aside>로컬 검수용 · 전부 draft · NAS/DB 미반영<br>288장 본문 + 18장 표지 + 18장 출처. 실제 iOS 화면과 다른 편집 미리보기입니다.<br>이전 철학 저작 배치와 함께 나중에 일괄 배포할 준비본입니다.</aside>
<nav aria-label="시리즈 목차">${posts.map((p,i)=>`<a href="#${escape(p.key)}">${i+1}. ${escape(p.title)}</a>`).join('')}</nav>
${posts.map((p,pi)=>`<section id="${escape(p.key)}"><h2>${pi+1}. ${escape(p.title)} · ${p.segments.length}장</h2><div class="cards">${p.segments.map((s,i)=>{
    const isCredits = i === p.segments.length-1;
    const [heading,...body]=(s.body||'').split('\n');
    const use=p.editorial.imageUses[i];
    const evidence=p.editorial.cardEvidence.find(e=>e.slide===i+1);
    return `<article><img loading="lazy" src="../../content-media/${escape(s.imageKey)}" alt="${escape(use.caption)}"><div><span class="number">${i+1} / ${p.segments.length} · ${i===0?'표지':isCredits?'출처':'본문'}</span>${isCredits?`<details><summary>출처 보기</summary><p>${links(s.body)}</p></details>`:`<h3>${escape(i===0?p.title:heading)}</h3><p>${escape(body.join('\n'))}</p><details><summary>이미지 설명·원전 위치</summary><p>${escape(use.caption)}</p>${evidence?`<p>${escape(evidence.reference)}</p>`:''}</details>`}</div></article>`;
  }).join('')}</div></section>`).join('\n')}
<footer>모든 글은 원전의 논의를 바탕으로 직접 쓴 한국어 해설입니다. 역사적 가설과 비유, 편집자의 해석을 구별합니다. 기존 이미지의 작가·원본·라이선스·변경 사항은 각 글의 마지막 출처 보기에 있습니다.</footer></main></body></html>\n`;
}
module.exports = {render};
if (require.main === module) process.stdout.write(render(JSON.parse(fs.readFileSync(path.join(__dirname,'posts.json'),'utf8')).posts));
