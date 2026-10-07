// Downloads only the two explicitly reviewed public-domain/CC0 assets.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assets = [
  ['learning-v9-cave.jpg', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/Grot_van_Plato%2C_RP-P-OB-10.545.jpg/960px-Grot_van_Plato%2C_RP-P-OB-10.545.jpg'],
  ['learning-v9-judgment.jpg', 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Kritik_der_Urteilskraft_%28_Cr%C3%ADtica_del_Juicio%29.jpg'],
];
(async () => {
  for (const [key, url] of assets) {
    const target = path.resolve(__dirname, '../../content-media', key);
    if (fs.existsSync(target)) { console.log(JSON.stringify({key, existing:true, sha256:crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex')})); continue; }
    const response = await fetch(url, {signal:AbortSignal.timeout(25000), headers:{'User-Agent':'EthicaEditorial/1.0 (https://github.com/Kangila404/Ethica)'}});
    if (!response.ok) throw new Error(`${key}: HTTP ${response.status}`);
    if (!(response.headers.get('content-type') || '').startsWith('image/')) throw new Error('Not an image');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 1000 || bytes[0] !== 255 || bytes[1] !== 216) throw new Error('Invalid JPEG');
    fs.writeFileSync(target, bytes, {flag:'wx'});
    console.log(JSON.stringify({key, bytes:bytes.length, sha256:crypto.createHash('sha256').update(bytes).digest('hex')}));
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
