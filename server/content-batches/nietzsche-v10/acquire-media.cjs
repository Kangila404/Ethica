// Explicit licensed references only; never uses credentials or touches existing media.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const entries = [
 ['apollo','Apollo of the Belvedere.jpg'],
 ['dionysus','Exekias Dionysos Staatliche Antikensammlungen 2044.jpg'],
 ['wagner','1895 Lenbach Richard Wagner anagoria.JPG'],
 ['theatre','Theatre of Dionysus 01382.JPG'],
 ['wanderer','Caspar David Friedrich - Wanderer above the Sea of Fog.jpeg'],
 ['gay-science','Die fröhliche Wissenschaft-Nietzsche-1887.djvu'],
 ['manuscript','Nietzsche Faksimile Vorrede Menschliches Allzumenschliches II.jpg'],
];
const plain = s => (s || '').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
(async () => {
 for(const [key,title] of entries) {
  const query = new URLSearchParams({action:'query',format:'json',titles:'File:'+title,prop:'imageinfo',iiprop:'url|extmetadata|size',iiurlwidth:'960'});
  const response = await fetch('https://commons.wikimedia.org/w/api.php?'+query,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'EthicaEditorial/1.0 (https://github.com/Kangila404/Ethica)'}});
  if(!response.ok) throw new Error('Metadata HTTP '+response.status);
  const page = Object.values((await response.json()).query.pages)[0];
  const info = page.imageinfo[0], meta = info.extmetadata;
  const license = plain(meta.LicenseShortName?.value);
  if(!['Public domain','CC BY 2.5','CC BY-SA 4.0'].includes(license)) throw new Error('Unreviewed license '+license);
  const url = (info.thumburl || info.url).split('?')[0];
  const imageKey = `learning-v10-${key}.jpg`;
  const file = path.resolve(__dirname,'../../content-media',imageKey);
  let bytes;
  if(fs.existsSync(file)) bytes = fs.readFileSync(file);
  else {
   const r = await fetch(url,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'EthicaEditorial/1.0'}});
   if(!r.ok) throw new Error(`${key}: HTTP ${r.status}`);
   bytes=Buffer.from(await r.arrayBuffer());
   if(bytes[0]!==255 || bytes[1]!==216 || bytes.length<1000) throw new Error('Invalid JPEG '+key);
   fs.writeFileSync(file,bytes,{flag:'wx'});
  }
  console.log(JSON.stringify({key,imageKey,title,creator:plain(meta.Artist?.value),credit:plain(meta.Credit?.value),attribution:plain(meta.Attribution?.value),description:plain(meta.ImageDescription?.value),sourceUrl:info.descriptionurl,license,licenseUrl:meta.LicenseUrl?.value || info.descriptionurl+'#Licensing',url,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),changes:'Commons 제공 이미지, 추가 크롭·색상 변경 없음.',verifiedOn:'2026-10-05'}));
  await new Promise(resolve=>setTimeout(resolve,1500));
 }
})().catch(error=>{console.error(error.message);process.exitCode=1});
