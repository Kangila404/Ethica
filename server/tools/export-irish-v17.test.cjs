const test=require('node:test'),assert=require('node:assert/strict');
const {inputs,validate,exportData,validateExport}=require('./export-irish-v17.cjs');
test('20 ordered articles, 288 image-bearing slides and draft status',()=>{const p=exportData(inputs());validateExport(p)});
test('duplicate image selection rejected',()=>{const d=inputs();d.plan['irish-01'][1]=d.plan['irish-01'][0];assert.throws(()=>validate(d,false),/duplicate/)});
test('different photos of same artwork rejected',()=>{const d=inputs(),k=d.plan['irish-01'];d.images.find(i=>i.key===k[1]).artworkId=d.images.find(i=>i.key===k[0]).artworkId;assert.throws(()=>validate(d,false),/duplicate artworkId/)});
test('same bytes under different filenames rejected',()=>{const d=inputs(),k=d.plan['irish-01'];d.images.find(i=>i.key===k[1]).sha256=d.images.find(i=>i.key===k[0]).sha256;assert.throws(()=>validate(d,false),/duplicate sha256/)});
test('missing image rejected',()=>{const d=inputs();d.plan['irish-01'][3]=-1;assert.throws(()=>validate(d,false),/missing image/)});
test('unsupported license rejected',()=>{const d=inputs();d.images[0].license='All rights reserved';assert.throws(()=>validate(d,false),/license/)});
test('corrupt asset rejected',()=>{const d=inputs();d.images[0].sha256='0'.repeat(64);assert.throws(()=>validate(d),/asset integrity/)});
test('missing source rejected',()=>{const d=inputs();d.articles[0].sourceIds.push('missing');assert.throws(()=>validate(d,false),/source missing/)});
test('publication cannot be inferred',()=>{const p=exportData(inputs());p.posts[0].status='published';assert.throws(()=>validateExport(p),/local draft/)});
test('invented DB identifier rejected',()=>{const p=exportData(inputs());p.posts[0].philosopherId=900;assert.throws(()=>validateExport(p),/identifiers/)});
test('missing context rejected',()=>{const d=inputs();d.images[0].context='';assert.throws(()=>validate(d,false),/attribution/)});
test('truncated body rejected',()=>{const d=inputs();d.articles[0].cards.pop();assert.throws(()=>validate(d,false),/body slide count/)});


test('AI disclosure required',()=>{const d=inputs();d.images.find(i=>i.kind==='ai').caption='invented old master';assert.throws(()=>validate(d,false),/AI disclosure/)});
test('AI may not receive a historical source',()=>{const d=inputs();d.images.find(i=>i.kind==='ai').sourceUrl='https://commons.wikimedia.org/';assert.throws(()=>validate(d,false),/invented source/)});
