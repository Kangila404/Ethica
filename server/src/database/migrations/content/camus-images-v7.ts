import portraits from './thinker-portraits-v1.json';
import v4 from './learning-images-v4.json';
import v5 from './learning-images-v5.json';
import v7 from './learning-images-v7.json';
import { LibraryArticle } from './learning-library-v5';
import { SlideImage } from './learning-slides-v3';

// Cover + twelve individually mapped body cards + source card. Never repeat an
// original within one article; cross-article reuse of a relevant source is OK.
const mapping: Record<string, readonly string[]> = {
  'camus-stranger': [
    'v:stranger-cover',
    'p:camus',
    'v:burial',
    'v:bathers',
    'v:letter',
    'v:algiers-sea',
    'n:algiers',
    'v:lawyers',
    'v:lawyers-meeting',
    'v:prison',
    'v:oran-church',
    'v:starry-rhone',
    'v:monk-sea',
    'v:novels',
  ],
  'camus-plague': [
    'v:plague-cover',
    'p:camus',
    'v:rats',
    'v:oran-port',
    'v:doctor',
    'v:nurses',
    'v:carriage',
    'v:letter',
    'v:oran-church',
    'v:antibes',
    'v:burial',
    'v:novels',
    'v:oran-street',
    'n:algiers',
  ],
  'camus-sisyphus': [
    'n:sisyphus',
    'p:camus',
    'n:algiers',
    'v:monk-sea',
    'v:starry-rhone',
    'v:kierkegaard',
    'n:jaspers',
    'n:tipasa',
    'v:don-juan',
    'v:dostoevsky',
    'v:sisyphus-stuck',
    'v:prison',
    'v:antibes',
    'p:nietzsche',
  ],
  'camus-rebel': [
    'v:oath-couder',
    'p:camus',
    'v:rights',
    'u:udhr',
    'v:prometheus',
    'p:nietzsche',
    'n:rousseau',
    'v:prison',
    'v:marx',
    'v:kalyayev',
    'v:cezanne',
    'n:tipasa',
    'v:fisherman',
    'v:novels',
  ],
  'camus-fall': [
    'v:fall-cover',
    'p:camus',
    'n:amsterdam-view',
    'v:lawyers',
    'v:self-portrait',
    'v:pont-royal',
    'v:pont-arts',
    'v:balance',
    'v:lawyers-meeting',
    'v:judges',
    'v:narcissus',
    'v:prison',
    'v:fisherman',
    'n:deux-magots',
  ],
};
const captions: Record<string, string> = {
  'n:algiers':
    '약 1900년 알제의 부두와 전차. 식민지 도시와 반복되는 일상의 역사적 참고 자료이며 소설의 사건이나 오랑 봉쇄의 기록은 아니다.',
  'n:sisyphus':
    '티치아노의 시지프 회화. 고대 신화의 후대 도상이며 카뮈의 책을 위해 제작된 삽화는 아니다.',
  'n:tipasa':
    '티파사 유적의 현대 사진. 카뮈의 지중해적 사유를 이해하는 맥락 자료이며 본문의 사건이나 추상 논증을 직접 기록한 것은 아니다.',
  'n:jaspers':
    '카를 야스퍼스의 초상. 《시지프 신화》에서 카뮈가 논쟁하는 사상가이며 해당 카드의 결론에 동의했다는 뜻은 아니다.',
  'n:rousseau':
    '장자크 루소의 초상. 《반항하는 인간》의 혁명·사회계약 논의를 이해하는 인물 자료이며 혁명 현장의 그림은 아니다.',
  'n:amsterdam-view':
    '베르크헤이더의 암스테르담 헤런흐라흐트 풍경. 소설 배경 도시의 오래된 도상이며 1950년대 술집의 모습은 아니다.',
  'n:deux-magots':
    '파리 레 되 마고 카페의 현대 사진. 카뮈 시대 문학의 도시적 맥락을 보여 주며 암스테르담의 소설 속 술집은 아니다.',
  'u:udhr':
    '엘리너 루스벨트와 세계인권선언. 보편적 권리의 역사적 맥락이며 카뮈의 반항 개념과 동일한 문서가 아니다.',
};

export function camusImages(article: LibraryArticle): SlideImage[] {
  const refs = mapping[article.key];
  if (!refs || refs.length !== article.cards.length + 2)
    throw new Error(`Incomplete Camus images: ${article.key}`);
  const images = refs.map((ref): SlideImage => {
    const [collection, key] = ref.split(':');
    if (collection === 'p') {
      const p = portraits.find((i) => i.key === key);
      if (!p) throw new Error(`Missing Camus portrait: ${ref}`);
      return { ...p, caption: p.note };
    }
    const catalog = collection === 'u' ? v4 : collection === 'n' ? v5 : v7;
    const img = catalog.find((i) => i.key === key);
    if (!img) throw new Error(`Missing Camus image: ${ref}`);
    return { ...img, caption: captions[ref] || img.caption };
  });
  for (const field of ['imageKey', 'sha256', 'sourceUrl'] as const)
    if (new Set(images.map((i) => i[field])).size !== images.length)
      throw new Error(`Repeated Camus ${field}: ${article.key}`);
  return images;
}

export function camusCredits(article: LibraryArticle): string {
  const text = [
    '더 읽기 · 자료 출처',
    ...article.references,
    '이미지 안내\n역사 사진·명화는 장소·인물·주제의 맥락 또는 비교 도상입니다. 본문의 사건을 직접 기록한 것으로 제시하지 않습니다. AI 표지는 별도로 표시했습니다. 한 게시글 안에서는 원본 이미지를 반복하지 않았습니다.',
    ...camusImages(article).map(
      (i, n) =>
        `${n + 1}번 슬라이드\n${i.caption}\n${i.creator}\n${i.sourceUrl}\n${i.license}\n${i.licenseUrl}\n${i.changes}`,
    ),
    '본문은 새로 쓴 한국어 요약·비평입니다. 현대 번역문이나 책 표지를 전재하지 않았으며, 원전 전체를 대체하지 않습니다.',
  ].join('\n\n');
  if (text.length > 10000)
    throw new Error(`Camus credits exceed segment limit: ${article.key}`);
  return text;
}
