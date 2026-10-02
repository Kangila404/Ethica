import portraits from './thinker-portraits-v1.json';
import v4 from './learning-images-v4.json';
import v5 from './learning-images-v5.json';
import v6 from './learning-images-v6.json';
import { LibraryArticle } from './learning-library-v5';
import { SlideImage } from './learning-slides-v3';

// Cover, four body cards, credits. No fallback: each topic is individually reviewed.
const mapping: Record<string, readonly string[]> = {
  'socrates-potidaea': [
    'v:socrates-alcibiades',
    'u:hoplites',
    'p:socrates',
    'n:athens-map',
    'n:school-athens',
    'p:plato',
  ],
  'socrates-crito': [
    'n:death-socrates',
    'p:socrates',
    'n:agora',
    'n:athens-map',
    'n:school-athens',
    'p:plato',
  ],
  'socrates-daimonion': [
    'p:socrates',
    'n:athena',
    'n:agora',
    'n:athens-map',
    'n:school-athens',
    'p:plato',
  ],
  'plato-gyges': [
    'v:ring',
    'n:athens-map',
    'n:agora',
    'p:socrates',
    'u:academy',
    'p:plato',
  ],
  'plato-chariot': [
    'v:chariot',
    'p:plato',
    'u:academy',
    'n:school-athens',
    'p:socrates',
    'v:papyrus',
  ],
  'plato-writing': [
    'v:papyrus',
    'v:theuth',
    'u:academy',
    'p:socrates',
    'n:school-athens',
    'p:plato',
  ],
  'epicurus-last-letter': [
    'p:epicurus',
    'n:pompeii-garden',
    'n:agora',
    'v:metrodorus',
    'n:rerum',
    'v:laertius',
  ],
  'epicurus-justice': [
    'p:epicurus',
    'n:agora',
    'u:stoa',
    'n:athens-map',
    'n:pompeii-garden',
    'v:laertius',
  ],
  'epicurus-gods': [
    'p:epicurus',
    'n:athena',
    'n:democritus',
    'n:rerum',
    'n:pompeii-garden',
    'v:laertius',
  ],
  'marcus-morning': [
    'p:marcus-aurelius',
    'n:forum',
    'n:pompeii-garden',
    'u:marcus',
    'n:column-marcus',
    'v:meditations',
  ],
  'marcus-purple': [
    'p:marcus-aurelius',
    'v:purple',
    'n:forum',
    'u:marcus',
    'n:column-marcus',
    'v:meditations',
  ],
  'marcus-anger': [
    'p:marcus-aurelius',
    'n:forum',
    'p:epictetus',
    'u:marcus',
    'n:column-marcus',
    'v:meditations',
  ],
};

const contextCaptions: Record<string, string> = {
  'n:athena':
    '아테나의 조각상. 고대 그리스 신들의 도상을 보여 주는 참고 자료이며 소크라테스의 신적 신호나 에피쿠로스가 말한 신의 형상을 특정하지 않는다.',
  'u:hoplites':
    '키지 도기의 중무장 보병 장면. 고대 병사의 도상을 보여 주며 소크라테스나 포테이다이아 전투 자체를 그린 것은 아니다.',
  'u:academy':
    '플라톤의 아카데미아로 해석되는 고대 모자이크. 함께 탐구하는 철학자들의 도상이며 특정 대화편의 장면을 기록한 것은 아니다.',
  'u:marcus':
    '마르쿠스 아우렐리우스의 기마상. 황제라는 공적인 지위를 보여 주는 자료이며 《명상록》 집필 장면은 아니다.',
  'n:column-marcus':
    '마르쿠스 아우렐리우스 원주. 황제의 군사적 위업을 기념하는 공적 기념물이며 개인적인 자기 권고와 통치의 실제는 구별해야 한다.',
  'n:rerum':
    '에피쿠로스의 사상을 후대에 전한 루크레티우스의 《사물의 본성에 관하여》 판본. 에피쿠로스의 마지막 편지 원본은 아니다.',
};

export function storyImages(article: LibraryArticle): SlideImage[] {
  const refs = mapping[article.key];
  if (!refs || refs.length !== article.cards.length + 2)
    throw new Error(`Incomplete story images: ${article.key}`);
  const images = refs.map((ref): SlideImage => {
    const [collection, key] = ref.split(':');
    if (collection === 'p') {
      const p = portraits.find((p) => p.key === key);
      if (!p) throw new Error(`Missing portrait: ${ref}`);
      return { ...p, caption: p.note };
    }
    const catalog =
      collection === 'u'
        ? v4
        : collection === 'n'
          ? v5
          : collection === 'v'
            ? v6
            : [];
    const image = catalog.find((i) => i.key === key);
    if (!image) throw new Error(`Missing story image: ${ref}`);
    return { ...image, caption: contextCaptions[ref] || image.caption };
  });
  for (const field of ['imageKey', 'sha256', 'sourceUrl'] as const)
    if (new Set(images.map((i) => i[field])).size !== images.length)
      throw new Error(`Repeated story ${field}: ${article.key}`);
  return images;
}

export function storyCredits(article: LibraryArticle): string {
  return [
    '더 읽기 · 자료 출처',
    ...article.references,
    '슬라이드 이미지 안내\n모든 슬라이드에 서로 다른 자료를 사용했습니다. 후대 재현화·조각·유적·판본은 관련 인물과 맥락을 보여 주며, 추상 이론이나 본문의 사건을 직접 기록한 자료로 제시하지 않습니다.',
    ...storyImages(article).map(
      (i, n) =>
        `${n + 1}번 슬라이드\n${i.caption}\n${i.creator}\n${i.sourceUrl}\n${i.license}\n${i.licenseUrl}\n${i.changes}`,
    ),
    '본문은 원전을 검토해 새로 쓴 한국어 요약·해설입니다. 현대 번역문을 전재하거나 확인되지 않은 직접 인용을 만들지 않았습니다.',
  ].join('\n\n');
}
