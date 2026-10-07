// Read-only with respect to DB/NAS. Generates local review artifacts from the exact migration payload.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, '.local/mythology-review');
const batches = [
  { slug: 'norse', version: 12, name: '북유럽 신화' },
  { slug: 'greek', version: 13, name: '그리스·로마 신화' },
];
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
fs.mkdirSync(output, { recursive: true });
for (const { slug, version, name } of batches) {
  const series = require(
    path.join(
      root,
      `server/dist/database/migrations/content/${slug}-series-v${version}.js`,
    ),
  );
  series[`validate${slug === 'greek' ? 'Greek' : 'Norse'}V${version}`]();
  const articles = series[`${slug}ArticlesV${version}`];
  const profile = series[`${slug}ProfileV${version}`];
  const imagesFor = series[`${slug}Images`];
  const creditsFor = series[`${slug}Credits`];
  const creditFor = series[`${slug}ImageCredit`];
  const batchKey = `ethica-${slug}-v${version}`;
  const catalog = {
    schemaVersion: 1,
    batchKey,
    categories: [],
    philosophers: [
      {
        key: slug,
        ...profile,
        existing: false,
        sources: Object.values(series[`${slug}SourcesV${version}`]),
      },
    ],
  };
  const posts = {
    schemaVersion: 1,
    batchKey,
    posts: articles.map((article) => {
      const images = imagesFor(article);
      const bodies = [null, ...article.cards, creditsFor(article)];
      return {
        key: article.key,
        status: 'published',
        philosopherKey: slug,
        title: article.title,
        imageKey: images[0].imageKey,
        segments: images.map((image, index) => ({
          segmentType: index ? 'text' : 'image',
          body: bodies[index],
          imageKey: image.imageKey,
        })),
        editorial: {
          learningGoal: article.title,
          sources: article.sourceSections.map((reference) => ({
            reference,
            supports: '해당 게시글의 신화 서사·전승 비교',
          })),
          reviewNotes: [
            '2026-10-07 사용자 공개 승인. 실제 배포 결과는 90번 문서 참조.',
            '고대 전승의 폭력·죽음·납치 및 일부 고전 미술 인체 표현 포함.',
          ],
          imageCredits: images.map((image) => ({ ...image })),
        },
      };
    }),
  };
  const review = [
    '# ' + name + ' 편집 검토',
    '',
    '2026-10-07 공개 승인. 이 파일은 로컬 산출물이며 운영 반영의 증거가 아닙니다.',
    '',
    '모든 글: 표지 1 + 본문 12 + 출처 1. 글 내부 원작·파일·해시 중복 검사. 공개 영역/CC 라이선스와 AI를 구분하며 직접 묘사가 아닌 관련 도상을 명시합니다.',
    '',
    ...articles.flatMap((article) => [
      '## ' + article.title,
      '',
      ...article.sourceSections.map((s) => '- ' + s),
      '',
      ...article.cards.map(
        (body, i) =>
          `${i + 1}. ${body.split('\n')[0]} — ${imagesFor(article)[i + 1].context}`,
      ),
      '',
    ]),
  ].join('\n');
  fs.mkdirSync(path.join(output, slug), { recursive: true });
  fs.writeFileSync(
    path.join(output, slug, 'catalog.json'),
    JSON.stringify(catalog, null, 2),
  );
  fs.writeFileSync(
    path.join(output, slug, 'posts.json'),
    JSON.stringify(posts, null, 2),
  );
  fs.writeFileSync(path.join(output, slug, 'editorial-review.md'), review);
  const sections = articles
    .map((article) => {
      const images = imagesFor(article),
        bodies = [article.title, ...article.cards, creditsFor(article)];
      return `<section id="${article.key}"><h2>${esc(article.title)}</h2><div class="cards">${images.map((image, i) => `<article><img loading="lazy" src="../../server/content-media/${esc(image.imageKey)}" alt="${esc(image.caption)}"><small>${i + 1}/14 · ${image.kind === 'generated' ? 'AI 삽화' : esc(image.license)}</small>${i === 13 ? '<details><summary>전체 출처</summary>' : ''}<p>${esc(bodies[i])}</p>${i === 13 ? '</details>' : ''}<details><summary>이미지 맥락·출처</summary><p>${esc(image.context + '\n' + creditFor(image))}</p></details></article>`).join('')}</div></section>`;
    })
    .join('');
  fs.writeFileSync(
    path.join(output, slug + '.html'),
    `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name} 검수본</title><style>body{font-family:system-ui;background:#151515;color:#eee;margin:24px;line-height:1.7}a,summary{color:#98caff}nav{display:flex;gap:16px;flex-wrap:wrap}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}article{background:#252525;padding:16px;min-width:0;border-radius:12px}img{width:100%;height:240px;object-fit:contain;background:#111}p{white-space:pre-wrap;overflow-wrap:anywhere}details{font-size:13px}small{color:#aaa}</style><h1>${name} · ${articles.length}편</h1><p>로컬 원고·이미지 검수용. 앱 UI와 다릅니다. 운영 배포 상태는 별도 기록을 확인하세요.</p><nav>${articles.map((a) => `<a href="#${a.key}">${a.key}</a>`).join('')}</nav>${sections}</html>`,
  );
  console.log(
    name,
    articles.length,
    'posts',
    articles.length * 14,
    'slides',
    'max credit length',
    Math.max(...articles.map((a) => creditsFor(a).length)),
  );
}
