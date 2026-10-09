const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  inputs,
  validate,
  exportData,
  validateExport,
} = require('./export-greek-v14.cjs');
test('24 ordered drafts, 288 illustrated slides, every asset hash verified', () => {
  const payload = exportData(inputs());
  validateExport(payload);
  assert.equal(
    payload.posts.reduce((n, p) => n + p.segments.length, 0),
    288,
  );
});
test('duplicate source image within an article is rejected', () => {
  const d = inputs();
  d.plan['greek-16'][1] = d.plan['greek-16'][0];
  assert.throws(() => validate(d, false), /duplicate/);
});
test('missing primary source is rejected', () => {
  const d = inputs();
  d.articles[0].sources[0].id = 'missing';
  assert.throws(() => validate(d, false), /source reference/);
});
test('wrong asset hash is rejected', () => {
  const d = inputs();
  d.images[0].sha256 = '0'.repeat(64);
  assert.throws(() => validate(d), /asset integrity/);
});
test('empty card and absent image are rejected', () => {
  const d = inputs();
  d.articles[0].cards[0] = '';
  assert.throws(() => validate(d, false), /body/);
  const e = inputs();
  e.plan['greek-16'][0][0] = -1;
  assert.throws(() => validate(e, false), /missing image/);
});
test('export cannot silently switch to published', () => {
  const payload = exportData(inputs());
  payload.posts[0].status = 'published';
  assert.throws(() => validateExport(payload), /publication requires/);
});
