// Local review only: npm run build, then node scripts/preview-dilemmas-v3.cjs
const fs = require('node:fs');
const path = require('node:path');
const {
  questionsV3,
  thinkers,
} = require('../dist/database/migrations/content/dilemmas-v3');
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
const name = (key) => thinkers.find((p) => p.key === key).name;
const choice = (a) =>
  `<section class="choice"><b>${escape(a.body)}</b>${a.philosopher ? `<span>${escape(name(a.philosopher))}</span>` : ''}<p>${escape(a.explanation.split('[자료 출처]')[0].trim())}</p></section>`;
const cards = questionsV3
  .map(
    (q, i) =>
      `<article data-search="${escape(q.category + ' ' + q.title + ' ' + q.answers.map((a) => name(a.philosopher)).join(' '))}"><header>${i + 1} · ${escape(q.category)} · ${q.usage === 'daily' ? '일일 질문' : '온보딩'}</header><h2>${escape(q.title)}</h2><img loading="lazy" src="../../server/content-media/${escape(q.imageKey)}" alt="관련 사상가 또는 참고 삽화"><p class="question">${escape(q.body)}</p>${q.answers.map(choice).join('')}${q.followup ? `<h3>공통 후속 질문</h3><p class="question">${escape(q.followup.body)}</p>${q.followup.answers.map(choice).join('')}` : ''}<details><summary>자료·이미지 출처</summary><p>${escape(q.answers[0].explanation.split('[자료 출처]')[1])}</p><a href="${escape(q.source)}" target="_blank" rel="noopener noreferrer">참고 자료 열기</a></details></article>`,
  )
  .join('\n');
const profiles = thinkers
  .filter((p) => p.added)
  .map(
    (p) =>
      `<section><h3>${escape(p.name)} <small>${escape(p.era)}</small></h3><p>${escape(p.school)}<br>${escape(p.coreThought)}</p><p>${escape(p.lifeRoots)}</p><a href="${escape(p.source)}">참고 자료</a></section>`,
  )
  .join('');
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ethica 질문 개정안</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f3ef;color:#282725;font:16px/1.75 system-ui,sans-serif}main{max-width:880px;margin:auto;padding:32px 20px}h1{font-size:30px}h2{font-size:25px}header,small,span{color:#6b665e;font-size:14px}input{width:100%;padding:16px;border:1px solid #bbb;border-radius:10px;font:inherit;margin:16px 0}article{background:white;border:1px solid #ddd7cd;border-radius:14px;padding:28px;margin:24px 0}article img{width:100%;max-height:280px;object-fit:contain;background:#eeeae3}p{white-space:pre-wrap}.question{font-size:19px}.choice{border-left:3px solid #768b79;background:#f5f7f3;padding:12px 18px;margin:12px 0}.choice span{display:block}.choice p{margin-bottom:0}details{border-top:1px solid #ddd;padding-top:16px;margin-top:20px}summary{cursor:pointer}a{color:#315a72}[hidden]{display:none}</style><main><h1>질문 개정안 · 79문항</h1><p>온보딩 50 · 일일 29 · 새 사상가 12명<br>로컬 검토본입니다. NAS에는 적용하지 않았습니다.<br>기존 질문·답변 기록은 보존하고 새 배정부터 개정판을 사용합니다.</p><details><summary>추가 사상가 12명</summary>${profiles}</details><label for="filter">카테고리·제목·철학자 검색</label><input id="filter" placeholder="예: 자유, 파핏, AI"><div id="cards">${cards}</div></main><script>document.getElementById('filter').addEventListener('input',function(){const term=this.value.trim().toLowerCase();document.querySelectorAll('article').forEach(a=>a.hidden=!a.dataset.search.toLowerCase().includes(term));});</script></html>`;
const target = path.resolve(
  __dirname,
  '../../.local/questions-v3-review/index.html',
);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, html, 'utf8');
console.log(target);
