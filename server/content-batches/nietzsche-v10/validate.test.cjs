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

test('all 18 draft posts, 324 slides and licensed image hashes match', () => validate());
test('rejects repeated cover image in a body slide', () => {
  assert.throws(() => validate({'early.authoring.json': data => {
    const first = data[0].cards.trim().split('\n')[0].split('|')[0];
    data[0].cards = data[0].cards.replace(`${first}|`, `${data[0].cover}|`);
  }}), /duplicate imageKey/);
});
test('rejects duplicate original under a different image key', () => {
  assert.throws(() => validate({'image-provenance.json': data => {
    data['p:nietzsche'].sourceUrl = data['7:balance'].sourceUrl;
  }}), /duplicate sourceUrl/);
});
test('rejects an altered media checksum', () => {
  assert.throws(() => validate({'image-provenance.json': data => {
    data['10:apollo'].sha256 = '0'.repeat(64);
  }}), /checksum mismatch/);
});
test('rejects a missing license reference', () => {
  assert.throws(() => validate({'image-provenance.json': data => {
    delete data['10:apollo'].licenseUrl;
  }}), /missing licenseUrl/);
});
test('rejects unknown images', () => {
  assert.throws(() => validate({'zarathustra.authoring.json': data => {
    data[0].cover = '9:nonexistent';
  }}), /Unknown image/);
});
test('rejects missing body slides', () => {
  assert.throws(() => validate({'beyond.authoring.json': data => {
    data[0].cards = data[0].cards.trim().split('\n').slice(1).join('\n');
  }}), /nietzsche-beyond-1/);
});
test('rejects credits exceeding the server body limit', () => {
  assert.throws(() => validate({'image-provenance.json': data => {
    data['10:apollo'].caption = '가'.repeat(10001);
  }}), /credits .* > 10000/);
});
test('rejects a published snapshot or unsynchronized edits', () => {
  assert.throws(() => validate({'posts.json': data => {
    data.posts[0].status = 'published';
  }}), /Snapshot drift/);
});
test('rejects oversized titles', () => {
  assert.throws(() => validate({'genealogy.authoring.json': data => {
    data[0].title = '가'.repeat(256);
  }}), /invalid title length/);
});

test('preview has all cards and only resolvable local image paths', () => {
  const payload = JSON.parse(fs.readFileSync(path.join(__dirname,'posts.json'),'utf8'));
  const html = fs.readFileSync(path.join(__dirname,'preview.html'),'utf8');
  assert.equal(html.trim(), require('./render-preview.cjs').render(payload.posts).trim());
  assert.equal((html.match(/<article>/g)||[]).length, 324);
  assert.equal((html.match(/<summary>출처 보기<\/summary>/g)||[]).length, 18);
  for (const [,src] of html.matchAll(/<img[^>]+src="([^"]+)"/g)) {
    assert(src.startsWith('../../content-media/'));
    assert(fs.existsSync(path.resolve(__dirname,src)));
  }
});

test('body cards have evidence, images and two or more sentences', () => {
  const {posts} = JSON.parse(fs.readFileSync(path.join(__dirname,'posts.json'),'utf8'));
  const bodies = [];
  for(const [pi,post] of posts.entries()) {
    assert.equal(post.editorial.seriesOrder,pi+1);
    assert.equal(post.editorial.cardEvidence.length,16);
    for(const [i,segment] of post.segments.slice(1,-1).entries()) {
      assert.equal(post.editorial.cardEvidence[i].slide,i+2);
      assert(post.editorial.cardEvidence[i].reference);
      const body = segment.body.split('\n').slice(1).join('\n');
      assert((body.match(/[.!?]/g)||[]).length >= 2, `${post.key}: ${i+2}`);
      assert(!body.includes('\uFFFD'));
      bodies.push(body);
    }
  }
  assert.equal(new Set(bodies).size,288, 'Repeated body paragraphs');
});

