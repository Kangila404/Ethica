import portraits from './thinker-portraits-v1.json';
import previous from './learning-images-v5.json';
import additions from './learning-images-v8.json';
import { LibraryArticle } from './learning-library-v5';
import { SlideImage } from './learning-slides-v3';

// Cover, two context cards, three three-card passages, three conclusions, credits.
// Mapping is editorial, not random. Reuse between articles is allowed, never within.
const mapping: Record<string, readonly string[]> = {
  'analects-01': [
    'v:teaching',
    'n:rongo',
    'p:confucius',
    'n:reading',
    'n:writing',
    'v:qufu',
    'n:zengzi',
    'n:bamboo',
    'n:brushpot',
    'n:ding',
    'n:jade',
    'n:dance',
    'n:qin',
    'n:chariot',
    'n:pine',
    'v:analects',
  ],
  'analects-02': [
    'n:chariot',
    'v:qufu',
    'p:confucius',
    'n:stars',
    'n:bamboo',
    'n:jade',
    'n:ding',
    'n:rongo',
    'n:dance',
    'n:reading',
    'n:writing',
    'v:teaching',
    'n:qin',
    'n:banquet',
    'n:pine',
    'v:analects',
  ],
  'analects-03': [
    'n:dance',
    'n:chariot',
    'n:qin',
    'n:ding',
    'n:jade',
    'v:qufu',
    'p:confucius',
    'n:qinplayer',
    'v:teaching',
    'n:zixia',
    'n:pine',
    'n:reading',
    'n:banquet',
    'n:bamboo',
    'n:rongo',
    'v:analects',
  ],
  'analects-04': [
    'p:confucius',
    'n:pine',
    'v:teaching',
    'n:reading',
    'n:writing',
    'n:mountain',
    'n:zengzi',
    'n:bamboo',
    'v:qufu',
    'n:ding',
    'n:jade',
    'n:banquet',
    'n:qin',
    'n:chariot',
    'n:rongo',
    'v:analects',
  ],
  'analects-05': [
    'v:teaching',
    'p:confucius',
    'v:qufu',
    'n:zaiyu',
    'n:writing',
    'n:brushpot',
    'n:zigong',
    'n:bamboo',
    'n:reading',
    'n:zilu',
    'n:yanhui',
    'n:banquet',
    'n:pine',
    'n:chariot',
    'n:rongo',
    'v:analects',
  ],
  'analects-06': [
    'n:yanhui',
    'n:rongo',
    'p:confucius',
    'n:reading',
    'n:bamboo',
    'n:pine',
    'n:qinplayer',
    'n:writing',
    'v:teaching',
    'n:zigong',
    'n:jade',
    'v:qufu',
    'n:banquet',
    'n:commentary',
    'n:qin',
    'v:analects',
  ],
  'analects-07': [
    'v:teaching',
    'n:commentary',
    'p:confucius',
    'n:rongo',
    'n:bamboo',
    'n:writing',
    'n:zixia',
    'n:brushpot',
    'n:reading',
    'n:chariot',
    'n:zilu',
    'n:mountain',
    'n:qin',
    'v:qufu',
    'n:pine',
    'v:analects',
  ],
  'analects-08': [
    'n:jade',
    'n:rongo',
    'p:confucius',
    'n:dance',
    'n:ding',
    'n:qin',
    'n:zengzi',
    'n:bamboo',
    'v:teaching',
    'n:chariot',
    'v:qufu',
    'n:mountain',
    'n:pine',
    'n:banquet',
    'n:commentary',
    'v:analects',
  ],
  'analects-09': [
    'n:pine',
    'n:rongo',
    'v:teaching',
    'p:confucius',
    'n:writing',
    'n:reading',
    'n:river',
    'n:qin',
    'n:qinplayer',
    'n:mountain',
    'n:bamboo',
    'n:brushpot',
    'n:chariot',
    'n:commentary',
    'v:qufu',
    'v:analects',
  ],
  'analects-10': [
    'v:qufu',
    'n:rongo',
    'p:confucius',
    'n:jade',
    'n:ding',
    'n:dance',
    'n:banquet',
    'n:writing',
    'n:qinplayer',
    'n:horse',
    'n:chariot',
    'v:teaching',
    'n:pine',
    'n:bamboo',
    'n:commentary',
    'v:analects',
  ],
};

export function analectsImages(article: LibraryArticle): SlideImage[] {
  const refs = mapping[article.key];
  if (!refs || refs.length !== article.cards.length + 2)
    throw new Error('Incomplete Analects images: ' + article.key);
  const images = refs.map((ref): SlideImage => {
    const [collection, key] = ref.split(':');
    if (collection === 'p') {
      const p = portraits.find((i) => i.key === key);
      if (!p) throw new Error('Missing Analects portrait: ' + ref);
      return { ...p, caption: p.note };
    }
    const actualKey = key === 'teaching' ? 'confucius-teaching' : key;
    const catalog = collection === 'v' ? previous : additions;
    const image = catalog.find((i) => i.key === actualKey);
    if (!image) throw new Error('Missing Analects image: ' + ref);
    return image;
  });
  for (const field of ['imageKey', 'sha256', 'sourceUrl'] as const)
    if (new Set(images.map((i) => i[field])).size !== images.length)
      throw new Error('Repeated Analects ' + field + ': ' + article.key);
  return images;
}

export function analectsCredits(article: LibraryArticle): string {
  const text = [
    '더 읽기 · 자료 출처',
    ...article.references,
    '이미지 안내\n고대 유물은 예악·문자·정치 문화의 맥락 자료입니다. 후대 회화·초상과 현대 공묘 사진은 공자 당시의 현장 기록이 아닙니다. 한 게시글 안에서는 같은 원본을 반복하지 않았습니다. AI 생성 이미지는 사용하지 않았습니다.',
    ...analectsImages(article).map(
      (i, n) =>
        `${n + 1}번 슬라이드\n${i.caption}\n${i.creator}\n${i.sourceUrl}\n${i.license}\n${i.licenseUrl}\n${i.changes}`,
    ),
    '뜻풀이와 해설은 새로 쓴 한국어입니다. 발췌 범위와 발화자를 표시했으며, 선별한 세 구절이 해당 편 전체를 대체하지 않습니다.',
  ].join('\n\n');
  if (text.length > 10000)
    throw new Error('Analects credits exceed segment limit: ' + article.key);
  return text;
}
