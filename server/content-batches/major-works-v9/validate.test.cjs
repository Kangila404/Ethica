const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, 'build.cjs'), 'utf8');

// All fault injection happens in memory. Production, database and source files are untouched.
function validate(overrides = {}) {
  const sandboxFs = {...fs, readFileSync(file, encoding) {
    const value = fs.readFileSync(file, encoding);
    const transform = overrides[path.basename(file)];
    if (!transform) return value;
    const data = JSON.parse(value);
    transform(data);
    return JSON.stringify(data);
  }};
  vm.runInNewContext(source, {
    __dirname, console:{log(){}}, process:{argv:[]},
    require(name) { return name === 'node:fs' ? sandboxFs : require(name); },
  }, {timeout:15000, filename:'build.cjs'});
}

test('all 14 draft posts, 248 slides and licensed image hashes match', () => validate());
test('rejects repeated cover image in a body slide', () => {
  assert.throws(() => validate({'kant.authoring.json': data => {
    const first = data[0].cards.trim().split('\n')[0].split('|')[0];
    data[0].cards = data[0].cards.replace(`${first}|`, `${data[0].cover}|`);
  }}), /duplicate imageKey/);
});
test('rejects duplicate original under a different image key', () => {
  assert.throws(() => validate({'image-provenance.json': data => {
    data['p:kant'].sourceUrl = data['3:kant-critique'].sourceUrl;
  }}), /duplicate sourceUrl/);
});
test('rejects an altered media checksum', () => {
  assert.throws(() => validate({'image-provenance.json': data => {
    data['9:cave'].sha256 = '0'.repeat(64);
  }}), /checksum mismatch/);
});
test('rejects a missing license reference', () => {
  assert.throws(() => validate({'image-provenance.json': data => {
    delete data['9:cave'].licenseUrl;
  }}), /missing licenseUrl/);
});
test('rejects unknown images', () => {
  assert.throws(() => validate({'plato.authoring.json': data => {
    data[0].cover = '9:nonexistent';
  }}), /Unknown image/);
});
test('rejects missing body slides', () => {
  assert.throws(() => validate({'schopenhauer.authoring.json': data => {
    data[0].cards = data[0].cards.trim().split('\n').slice(1).join('\n');
  }}), /schopenhauer-world-1/);
});
test('rejects credits exceeding the server body limit', () => {
  assert.throws(() => validate({'image-provenance.json': data => {
    data['9:cave'].caption = '가'.repeat(10001);
  }}), /credits .* > 10000/);
});
test('rejects a published snapshot or unsynchronized edits', () => {
  assert.throws(() => validate({'posts.json': data => {
    data.posts[0].status = 'published';
  }}), /Snapshot drift/);
});
test('rejects oversized titles', () => {
  assert.throws(() => validate({'rawls.authoring.json': data => {
    data[0].title = '가'.repeat(256);
  }}), /invalid title length/);
});
