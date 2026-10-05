// Offline content packaging only. Never connects to a database or a remote service.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const batchKey = 'ethica-nietzsche-2026-10-05-v10';
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const drafts = ['early', 'gay-science', 'zarathustra', 'beyond', 'genealogy', 'twilight'].flatMap(author => read(`${author}.authoring.json`));
const images = read('image-provenance.json');
const names = {nietzsche:'프리드리히 니체'};
const imageFor = ref => { assert(images[ref], `Unknown image: ${ref}`); return images[ref]; };
const used = new Set();
const posts = drafts.map((draft, postIndex) => {
  assert(names[draft.philosopherKey], `Unknown philosopher: ${draft.philosopherKey}`);
  assert(draft.title.length > 0 && draft.title.length <= 255, `${draft.key}: invalid title length`);
  const rows = draft.cards.trim().split('\n').map(line => {
    const cells = line.split('|');
    assert.equal(cells.length, 4, `Malformed card: ${draft.key}`);
    const [ref, heading, body, section] = cells;
    assert(body.length > 35 && `${heading}\n${body}`.length <= 10000 && heading && section, `${draft.key}: invalid body card`);
    return {ref, heading, body, section};
  });
  const refs = [draft.cover, ...rows.map(row => row.ref), draft.credits];
  const assets = refs.map(imageFor);
  for (const asset of assets) used.add(asset.imageKey);
  for (const field of ['imageKey', 'sha256', 'sourceUrl']) {
    assert.equal(new Set(assets.map(asset => asset[field])).size, assets.length, `${draft.key}: duplicate ${field}`);
  }
  // Explicit original-work family check: a crop is not a distinct image.
  const families = refs.map(ref => ['5:school-athens', '3:aristotle-raphael'].includes(ref) ? 'raphael-school-athens' : imageFor(ref).sourceUrl);
  assert.equal(new Set(families).size, refs.length, `${draft.key}: repeated original work`);
  const sources = [{reference:draft.source, supports:`《${draft.work}》 ${draft.range}`}, ...(draft.sources || [])];
  const credits = [
    '더 읽기 · 자료 출처',
    `《${draft.work}》\n${draft.range}`,
    ...sources.map(source => `${source.supports}\n${source.reference}`),
    '본문은 원전의 직역이 아닌 독립적인 한국어 해설입니다. 후대 회화·현대 제도 사진은 본문을 비교하기 위한 자료이며 철학자의 실제 경험이나 직접 예시로 간주하지 않습니다.',
    ...assets.map((asset, index) => `${index + 1}장 · ${asset.caption || asset.note}\n${asset.creator}\n원본: ${asset.sourceUrl}\n${asset.license} · ${asset.licenseUrl}\n${asset.changes}`),
  ].join('\n\n');
  const segments = [
    {segmentType:'image', body:null, imageKey:assets[0].imageKey},
    ...rows.map((row, index) => ({segmentType:'text', body:`${row.heading}\n${row.body}`, imageKey:assets[index + 1].imageKey})),
    {segmentType:'text', body:credits, imageKey:assets.at(-1).imageKey},
  ];
  const expected = 18;
  assert.equal(segments.length, expected, draft.key);
  assert(credits.length <= 10000, `${draft.key}: credits ${credits.length} > 10000`);
  return {
    key:draft.key, status:'draft', philosopherKey:draft.philosopherKey,
    title:draft.title, imageKey:assets[0].imageKey, segments,
    editorial:{
      learningGoal:`《${draft.work}》의 ${rows[0].heading}에서 ${rows.at(-1).heading}까지 논증을 읽고 주요 구분과 한계를 이해한다.`,
      seriesOrder:postIndex + 1,
      sources,
      imageBrief:'모든 슬라이드에 출처가 있는 기존 자료 사용. 글 내부 원본 중복 금지. image-provenance.json의 권리·변경 사항 유지.',
      reviewNotes:[
        '2026-10-05 사용자 지시: 대량 일괄 배포를 위한 로컬 준비만. NAS·DB·CI/CD 반영 금지.',
        '표지·출처도 슬라이드 수에 포함. 기존 공개 글을 변경하지 않는 별도 배치.',
        '본문은 니체 원저의 논의를 바탕으로 직접 쓴 한국어 해설. 현대 번역문은 복사하지 않음. 잠언·가설·비유를 과학적 사실이나 직접 인용으로 바꾸지 않음.',
      ],
      cardEvidence:rows.map((row, index) => ({slide:index + 2, heading:row.heading, reference:`《${draft.work}》 ${row.section}`})),
      imageUses:refs.map((ref, index) => ({slide:index + 1, imageRef:ref, imageKey:assets[index].imageKey, caption:assets[index].caption || assets[index].note})),
    },
  };
});
assert.equal(posts.length, 18);
assert.equal(new Set(posts.map(post => post.key)).size, 18);
assert.equal(posts.reduce((sum, post) => sum + post.segments.length, 0), 324);
for (const [ref, asset] of Object.entries(images)) {
  assert(used.has(asset.imageKey), `Unused image metadata: ${ref}`);
  for (const field of ['imageKey', 'sha256', 'sourceUrl', 'creator', 'license', 'licenseUrl', 'changes']) assert(asset[field], `${ref}: missing ${field}`);
  assert(/^[a-zA-Z0-9._-]+$/.test(asset.imageKey));
  const bytes = fs.readFileSync(path.resolve(__dirname, '../../content-media', asset.imageKey));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), asset.sha256, `${ref}: checksum mismatch`);
}
const catalog = {schemaVersion:1, batchKey, categories:[], philosophers:Object.entries(names).map(([key, name]) => ({key, name, existing:true})), note:'existing은 소스 카탈로그 기준. 운영 DB는 이번 작업에서 조회하지 않았으며 등록 시 이름/별칭을 검증해야 한다.'};
const payload = {schemaVersion:1, batchKey, posts};
const summary = {batchKey, deployment:'not-requested-do-not-deploy', postCount:18, slideCount:324, bodySlideCount:288, distinctImages:used.size, aiGeneratedImages:0, posts:posts.map(post => ({key:post.key, title:post.title, philosopherKey:post.philosopherKey, status:post.status, slides:post.segments.length, creditsCharacters:post.segments.at(-1).body.length}))};
const outputs = {'posts.json':payload, 'catalog.json':catalog, 'manifest.json':summary};
if (process.argv.includes('--bundle')) {
  const selection = process.argv.find(arg => arg.startsWith('--post='));
  process.stdout.write(JSON.stringify(selection ? payload.posts.find(post => post.key === selection.slice(7)) : {'catalog.json':catalog, 'manifest.json':summary}));
} else {
  for (const [name, expected] of Object.entries(outputs)) assert.deepEqual(read(name), expected, `Snapshot drift: ${name}`);
  console.log(JSON.stringify({ok:true, ...summary}, null, 2));
}

