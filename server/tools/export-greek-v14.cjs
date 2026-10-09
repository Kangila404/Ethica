// Local editorial export only. Does not connect to a database or deploy anything.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const directory = path.join(root, 'server/content-drafts/greek-v14');
const media = path.join(root, 'server/content-media');
const batchKey = 'ethica-greek-v14';
const read = (name) =>
  JSON.parse(fs.readFileSync(path.join(directory, name + '.json'), 'utf8'));
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
const hash = (file) =>
  crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function inputs() {
  return {
    articles: ['heroes', 'troy-and-returns', 'aeneas-and-rome'].flatMap(read),
    sources: read('sources'),
    images: read('images'),
    plan: read('image-plan'),
  };
}
function validate(data, checkFiles = true) {
  const { articles, sources, images, plan } = data;
  assert.equal(articles.length, 24, '24 articles required');
  assert.deepEqual(
    articles.map((a) => a.key),
    Array.from({ length: 24 }, (_, i) => 'greek-' + (i + 16)),
    'ordered keys 16–39',
  );
  assert.equal(Object.keys(plan).length, 24, 'image plan size');
  assert.equal(
    new Set(images.map((i) => i.key)).size,
    images.length,
    'unique asset keys',
  );
  const byKey = new Map(images.map((i) => [i.key, i]));
  const used = new Set();
  for (const a of articles) {
    assert(a.title && a.title.length <= 255, a.key + ': title');
    assert.equal(a.cards.length, 10, a.key + ': ten body cards');
    assert(a.sources.length, a.key + ': primary sources');
    for (const s of a.sources) {
      assert(
        sources[s.id]?.title && /^https:\/\//.test(sources[s.id].url),
        a.key + ': source reference',
      );
      assert(s.section && s.supports, a.key + ': source scope');
    }
    for (const c of a.cards)
      assert(
        typeof c === 'string' &&
          c.includes('\n') &&
          c.length < 10000 &&
          !/\ufffd|TODO|TBD/.test(c),
        a.key + ': body',
      );
    assert.equal(
      plan[a.key]?.length,
      12,
      a.key + ': cover + ten cards + credits',
    );
    const selected = plan[a.key].map(([key, context]) => {
      assert(byKey.has(key) && context, a.key + ': missing image/context');
      used.add(key);
      return byKey.get(key);
    });
    for (const field of ['key', 'imageKey', 'sha256', 'artworkId']) {
      assert.equal(
        new Set(selected.map((i) => i[field])).size,
        12,
        a.key + ': duplicate ' + field,
      );
    }
  }
  assert.equal(used.size, images.length, 'no unreferenced image metadata');
  for (const i of images) {
    assert(/^greek-v14-\d{4}\.jpg$/.test(i.imageKey), 'safe image path');
    assert(
      i.kind === 'historical' && i.caption && i.creator && i.changes,
      'image attribution',
    );
    assert(
      /^https?:\/\//.test(i.sourceUrl) && /^https?:\/\//.test(i.licenseUrl),
      'credit URLs',
    );
    assert(
      /^(Public domain|CC0|CC BY(?:-SA)? (?:2\.0|2\.5|3\.0|4\.0))$/.test(
        i.license,
      ),
      'review license: ' + i.license,
    );
    assert(/^[a-f0-9]{64}$/.test(i.sha256), 'image SHA256');
    if (checkFiles)
      assert.equal(
        hash(path.join(media, i.imageKey)),
        i.sha256,
        'asset integrity: ' + i.imageKey,
      );
  }
}
function exportData(data) {
  validate(data);
  const byKey = new Map(data.images.map((i) => [i.key, i]));
  const posts = data.articles.map((a) => {
    const images = data.plan[a.key].map(([key, context]) => ({
      ...byKey.get(key),
      context,
    }));
    const sources = a.sources.map((s) => ({ ...s, ...data.sources[s.id] }));
    const credits = [
      '더 읽기 · 자료 출처',
      ...sources.map((s) => `${s.title} · ${s.section}\n${s.url}`),
      '본문은 원전을 바탕으로 새로 쓴 한국어 요약과 편집 해석입니다. 후대 미술은 고대 사건의 기록 사진이 아닙니다.',
      '이미지 출처',
      ...images.map(
        (i, n) =>
          `${n + 1}. ${i.caption}\n${i.creator} · ${i.license}\n${i.sourceUrl}\n${i.licenseUrl === i.sourceUrl + '#Licensing' ? '' : i.licenseUrl}`,
      ),
      '모든 이미지: Wikimedia Commons 제공 축소본. 원본 구성·색상 변경 없음.',
    ].join('\n\n');
    assert(credits.length <= 10000, a.key + ': credits too long');
    const bodies = [null, ...a.cards, credits];
    return {
      key: a.key,
      status: 'draft',
      philosopherKey: 'greek',
      title: a.title,
      imageKey: images[0].imageKey,
      segments: images.map((i, n) => ({
        segmentType: n ? 'text' : 'image',
        body: bodies[n],
        imageKey: i.imageKey,
      })),
      editorial: {
        part: a.part,
        learningGoal: a.title,
        sources,
        imageCredits: images,
        reviewNotes: [
          '로컬 작성 완료. 운영 등록·공개·배포 승인 및 실행은 별도.',
          '원전 서사와 편집 해석을 구분. 현대 번역문 직접 인용 없음.',
          '고대 전승의 죽음·폭력·납치와 일부 고전 미술의 인체 표현 포함.',
          '귀향 2·3은 기존 오디세우스 5부작의 교체가 아닌 주제별 보충 독서.',
        ],
      },
    };
  });
  return { schemaVersion: 1, batchKey, posts };
}
function validateExport(payload) {
  assert.equal(payload.posts.length, 24);
  for (const post of payload.posts) {
    assert.equal(
      post.status,
      'draft',
      'publication requires separate approval',
    );
    assert.equal(post.philosopherKey, 'greek');
    assert.equal(post.segments.length, 12);
    assert.equal(post.imageKey, post.segments[0].imageKey);
    assert(
      post.segments.every(
        (s) => s.imageKey && ['text', 'image'].includes(s.segmentType),
      ),
    );
    assert(
      post.segments
        .filter((s) => s.segmentType === 'text')
        .every((s) => s.body?.trim() && s.body.length <= 10000),
    );
  }
}
function run() {
  const data = inputs();
  const payload = exportData(data);
  validateExport(payload);
  const catalog = {
    schemaVersion: 1,
    batchKey,
    categories: [],
    philosophers: [
      {
        key: 'greek',
        name: '그리스·로마 신화',
        category: 'mythology',
        existing: true,
        existingEvidence:
          'server/src/database/migrations/content/greek-series-v13.ts',
      },
    ],
  };
  for (const [name, value] of [
    ['posts', payload],
    ['catalog', catalog],
  ])
    fs.writeFileSync(
      path.join(directory, name + '.json'),
      JSON.stringify(value, null, 2) + '\n',
    );
  const review = [
    '# 그리스·로마 신화 후속 24편 편집 검토',
    '',
    '로컬 초안. NAS/DB/main/CD 변경 없음. 자동 import 파일이 아니라 편집 교환용 JSON이다.',
    '',
    '표지 1 + 본문 10 + 출처 1 = 글당 12장, 총 288장. 모든 장에 실제 이미지와 라이선스 기록. 고전 작품의 전승과 후대 화가의 도상이 다른 경우 이미지 맥락에 구별한다.',
    '',
    '신화의 역사적 사실성을 주장하지 않는다. 카드 후반의 책임·폭력·귀향 등에 관한 설명은 원전의 직접 인용이나 작가의 발언이 아닌 편집 해석이다.',
    '',
    '수동 검수: 사진·판화가 달라도 같은 원작이면 교체. 본문과 그림의 시점·인물 불일치는 교체하거나 관련 도상으로 명시. 워터마크 자료는 제외.',
    '',
    '주요 구별: 헤라클레스의 광기 발생 순서, 테세우스의 아리아드네 전승, 일리아스의 끝과 목마 사건, 오디세이아와 후대 속편, 아이네아스와 로물루스의 세대 차이, 아이네이스의 마지막 결투와 로마사 1권의 후속 전승.',
    '',
    '공개 전 할 일: 신규 마이그레이션에서 기존 그리스 프로필의 첫 15편 한정 소개를 갱신하고 글 24편을 추가한다. 기존 v13 마이그레이션은 수정하지 않는다. 운영 ID는 실제 조회로 확인한다. 이번에는 SQL/마이그레이션을 실행하거나 생성하지 않았다.',
    '',
  ];
  for (const post of payload.posts) {
    review.push(
      '## ' + post.key + ' · ' + post.title,
      '',
      '원전 근거:',
      ...post.editorial.sources.map(
        (s) => `- [${s.title}](${s.url}) ${s.section}: ${s.supports}`,
      ),
      '',
      '카드별 검토(본문 순서; 사실의 범위는 위 원전 구간, 논평은 편집 해석):',
      ...post.segments
        .slice(1, -1)
        .map(
          (s, n) =>
            `- ${n + 1}. ${s.body.split('\n')[0]} — ${post.editorial.imageCredits[n + 1].context}`,
        ),
      '',
    );
  }
  fs.writeFileSync(
    path.join(directory, 'editorial-review.md'),
    review.join('\n') + '\n',
  );
  const preview = path.join(root, '.local/greek-v14-review');
  fs.mkdirSync(preview, { recursive: true });
  const html = payload.posts
    .map(
      (post) =>
        `<section id="${post.key}"><h2>${esc(post.title)}</h2><div class="cards">${post.segments
          .map((s, n) => {
            const i = post.editorial.imageCredits[n];
            return `<article><img loading="lazy" src="../../server/content-media/${esc(s.imageKey)}" alt="${esc(i.context)}"><small>${n + 1}/12 · ${esc(i.license)}</small>${n === 11 ? '<details><summary>전체 출처</summary>' : ''}<p>${esc(n === 0 ? post.title : s.body)}</p>${n === 11 ? '</details>' : ''}<details><summary>이미지 맥락·출처</summary><p>${esc(i.context)}</p><p>${esc(i.caption)}<br>${esc(i.creator)}</p><a href="${esc(i.sourceUrl)}">원본 기록</a> · <a href="${esc(i.licenseUrl)}">${esc(i.license)}</a><p>${esc(i.changes)}</p></details></article>`;
          })
          .join('')}</div></section>`,
    )
    .join('');
  fs.writeFileSync(
    path.join(preview, 'index.html'),
    `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>그리스·로마 신화 후속 24편</title><style>body{margin:auto;padding:24px;max-width:1500px;background:#171717;color:#eee;font:17px/1.65 system-ui}a{color:#9dcaff}nav{columns:2}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}article{background:#252525;padding:16px;border-radius:12px}img{width:100%;height:260px;object-fit:contain;background:#111}p{white-space:pre-wrap;overflow-wrap:anywhere}small{color:#bbb}h2{margin-top:60px}details{font-size:14px}summary{cursor:pointer}</style><h1>그리스·로마 신화 · 남은 이야기</h1><p>24편 · 288장 · 로컬 초안 / NAS 미반영</p><nav>${payload.posts.map((p) => `<div><a href="#${p.key}">${esc(p.title)}</a></div>`).join('')}</nav>${html}</html>`,
  );
  console.log(
    JSON.stringify({
      articles: payload.posts.length,
      slides: payload.posts.reduce((n, p) => n + p.segments.length, 0),
      historicalAssets: data.images.length,
      assetMiB: Number(
        (
          data.images.reduce(
            (n, i) => n + fs.statSync(path.join(media, i.imageKey)).size,
            0,
          ) /
          1024 /
          1024
        ).toFixed(1),
      ),
      preview: path.join(preview, 'index.html'),
      status: 'draft; not deployed',
    }),
  );
}
module.exports = { inputs, validate, exportData, validateExport };
if (require.main === module) run();
