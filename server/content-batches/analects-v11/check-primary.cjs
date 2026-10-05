// Read-only online source check, one request at a time with a bounded timeout.
const books = require('../../src/database/migrations/content/analects-books-v11.json');
const normalize = s => s.replace(/[為爲]/g,'爲').replace(/[修脩]/g,'脩').replace(/[^一-鿿]/g,'');
(async () => {
  let passed = 0;
  for (const b of books) {
    const params = new URLSearchParams({action:'parse',format:'json',oldid:String(b.sourceRevision),prop:'wikitext|revid'});
    const response = await fetch('https://zh.wikisource.org/w/api.php?'+params,{signal:AbortSignal.timeout(20000)});
    if (!response.ok) throw Error('Primary source HTTP '+response.status);
    const result = await response.json();
    if (result.parse?.revid !== b.sourceRevision) throw Error('Wrong source revision');
    const source = normalize(result.parse.wikitext['*']);
    const missing = b.passages.filter(p => !source.includes(normalize(p.quote)));
    console.log(JSON.stringify({book:b.key,revision:b.sourceRevision,checked:3,missing:missing.map(p=>p.locator)}));
    passed += 3-missing.length;
    await new Promise(resolve => setTimeout(resolve,2200));
  }
  console.log(JSON.stringify({verified:passed,total:30}));
  if (passed !== 30) process.exitCode=1;
})().catch(e => {console.error(e.message);process.exitCode=1;});
