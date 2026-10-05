// Read-only. Build server first; prints one article at a time or the whole preview.
const {analectsArticlesV11,remainingAnalectsImages,remainingAnalectsCredits}=require('../../dist/database/migrations/content/analects-v11');
const {render}=require('../nietzsche-v10/render-preview.cjs');
const posts=analectsArticlesV11.map(a=>{
  const imgs=remainingAnalectsImages(a),bodies=[null,...a.cards,remainingAnalectsCredits(a)];
  return {key:a.key,title:a.title,segments:imgs.map((image,i)=>({imageKey:image.imageKey,body:bodies[i]})),editorial:{imageUses:imgs.map(i=>({caption:i.caption})),cardEvidence:[]}};
});
const selected=process.argv[2]?posts.filter(p=>p.key===process.argv[2]):posts;
const html=render(selected)
  .replace('Ethica 니체 18편 · 로컬 검수','Ethica 논어 11–20편 · 검수')
  .replace('니체 읽기 · 18편 / 324장','논어 후반부 · 10편 / 160장')
  .replace('로컬 검수용 · 전부 draft · NAS/DB 미반영<br>288장 본문 + 18장 표지 + 18장 출처. 실제 iOS 화면과 다른 편집 미리보기입니다.<br>이전 철학 저작 배치와 함께 나중에 일괄 배포할 준비본입니다.','공개 승인 원고 · 본문 140장 + 표지 10장 + 출처 10장.<br>논어 스무 편 중 후반 열 편의 선별 구절 해설이며 전편 완역이 아닙니다. 실제 iOS 화면과 다른 편집 미리보기입니다.');
if(process.argv[2])process.stdout.write(html.match(/<section[\s\S]*?<\/section>/)[0]);
else process.stdout.write(html);
