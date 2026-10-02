import { articleImage, learningPostsV2 } from './learning-posts-v2';
import { thinkerPortrait } from './thinker-profiles-v1';
import illustrations from './learning-images-v2.json';
import additions from './learning-images-v3.json';

type Article = (typeof learningPostsV2)[number];
export interface SlideImage {
  imageKey: string;
  sha256: string;
  creator: string;
  caption: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  changes: string;
}

// Immutable, reviewed mapping for the SIX body cards, in their existing order.
// Portraits identify the subject; book pages identify the discussed work, not
// literal depictions of abstract concepts. Reuse is intentional and attributed.
const bodyImages: Record<string, readonly string[]> = {
  'kant:life': [
    'portrait',
    'portrait',
    'portrait',
    'kant-critique',
    'kant-critique',
    'portrait',
  ],
  'kant:theory': ['work', 'portrait', 'work', 'work', 'portrait', 'work'],
  'mill:life': [
    'portrait',
    'portrait',
    'portrait',
    'harriet',
    'work',
    'portrait',
  ],
  'mill:theory': ['work', 'work', 'portrait', 'portrait', 'work', 'work'],
  'aristotle:life': [
    'portrait',
    'aristotle-raphael',
    'portrait',
    'portrait',
    'work',
    'aristotle-raphael',
  ],
  'aristotle:theory': [
    'work',
    'aristotle-raphael',
    'portrait',
    'work',
    'aristotle-raphael',
    'work',
  ],
  'epictetus:life': [
    'portrait',
    'portrait',
    'portrait',
    'nicopolis',
    'work',
    'portrait',
  ],
  'epictetus:theory': ['portrait', 'work', 'work', 'portrait', 'work', 'work'],
  'rawls:life': [
    'portrait',
    'portrait',
    'harvard',
    'work',
    'portrait',
    'portrait',
  ],
  'rawls:theory': [
    'portrait',
    'work',
    'portrait',
    'portrait',
    'portrait',
    'work',
  ],
};

function resolveImage(article: Article, key: string): SlideImage {
  if (key === 'portrait') {
    const image = thinkerPortrait(article.philosopher);
    return { ...image, caption: image.note };
  }
  const image =
    key === 'work'
      ? illustrations.find((i) => i.key === article.philosopher)
      : additions.find((i) => i.key === key);
  if (!image) throw new Error(`Missing slide image: ${key}`);
  return image;
}

export function slideImages(article: Article): SlideImage[] {
  const keys = bodyImages[`${article.philosopher}:${article.kind}`];
  if (!keys || keys.length !== article.cards.length)
    throw new Error(`Incomplete slide mapping: ${article.title}`);
  const cover = articleImage(article);
  return [
    { ...cover, caption: 'caption' in cover ? cover.caption : cover.note },
    ...keys.map((key) => resolveImage(article, key)),
    resolveImage(article, 'work'),
  ];
}

export function slideCredits(article: Article): string {
  const images = slideImages(article);
  const unique = [...new Map(images.map((i) => [i.imageKey, i])).values()];
  return [
    '더 읽기 · 자료 출처',
    ...article.references,
    '슬라이드 이미지 안내\n번호는 표지부터 1번입니다. 초상은 인물을, 책 이미지는 관련 저작을 소개하는 자료이며 같은 자료를 여러 슬라이드에서 재사용했습니다.',
    ...unique.map((image) => {
      const numbers = images.flatMap((i, index) =>
        i.imageKey === image.imageKey ? [index + 1] : [],
      );
      return `${numbers.join('·')}번 슬라이드\n${image.caption}\n${image.creator}\n${image.sourceUrl}\n${image.license}\n${image.licenseUrl}\n${image.changes}`;
    }),
    '본문은 원전과 연구 자료를 참고해 새로 작성한 해설이며 직접 인용문이 아닙니다.',
  ].join('\n\n');
}
