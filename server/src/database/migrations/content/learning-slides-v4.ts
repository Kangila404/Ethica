import { articleImage, learningPostsV2 } from './learning-posts-v2';
import { thinkerPortrait } from './thinker-profiles-v1';
import works from './learning-images-v2.json';
import prior from './learning-images-v3.json';
import additions from './learning-images-v4.json';
import type { SlideImage } from './learning-slides-v3';

type Article = (typeof learningPostsV2)[number];

// Immutable, reviewed replacement batch. Each row is SIX body images followed
// by the credits image. The original cover remains the first (eighth) image.
// Reuse BETWEEN articles is allowed; no repeated source WITHIN one article.
const mapping: Record<string, readonly string[]> = {
  'kant:life': [
    'konigsberg',
    'newton',
    'albertina',
    'kant-critique',
    'practical',
    'kant-tomb',
    'work',
  ],
  'kant:theory': [
    'portrait',
    'practical',
    'morals',
    'peace',
    'udhr',
    'enlightenment',
    'kant-critique',
  ],
  'mill:life': [
    'james-mill',
    'wordsworth',
    'east-india',
    'harriet',
    'liberty',
    'mill-grave',
    'work',
  ],
  'mill:theory': [
    'bentham',
    'women',
    'wordsworth',
    'portrait',
    'liberty',
    'harriet',
    'east-india',
  ],
  'aristotle:life': [
    'stagira',
    'academy',
    'lesbos',
    'alexander',
    'lyceum',
    'chalcis',
    'work',
  ],
  'aristotle:theory': [
    'lyceum',
    'aristotle-raphael',
    'academy',
    'hoplites',
    'ethics-vi',
    'symposium',
    'portrait',
  ],
  'epictetus:life': [
    'hierapolis',
    'roman-slave',
    'enchiridion',
    'nicopolis',
    'arrian-front',
    'zeno',
    'work',
  ],
  'epictetus:theory': [
    'portrait',
    'enchiridion',
    'arrian-front',
    'zeno',
    'stoa',
    'marcus',
    'nicopolis',
  ],
  'rawls:life': [
    'princeton',
    'oxford',
    'harvard',
    'work',
    'capitol',
    'constitution',
    'udhr',
  ],
  'rawls:theory': [
    'capitol',
    'portrait',
    'udhr',
    'school',
    'food',
    'constitution',
    'harvard',
  ],
};

function resolveImage(article: Article, key: string): SlideImage {
  if (key === 'portrait') {
    const image = thinkerPortrait(article.philosopher);
    return { ...image, caption: image.note };
  }
  const image =
    key === 'work'
      ? works.find((i) => i.key === article.philosopher)
      : [...prior, ...additions].find((i) => i.key === key);
  if (!image) throw new Error(`Missing unique slide image: ${key}`);
  return image;
}

export function uniqueSlideImages(article: Article): SlideImage[] {
  const keys = mapping[`${article.philosopher}:${article.kind}`];
  if (!keys || keys.length !== article.cards.length + 1)
    throw new Error(`Incomplete unique slide mapping: ${article.title}`);
  const cover = articleImage(article);
  const images = [
    { ...cover, caption: 'caption' in cover ? cover.caption : cover.note },
    ...keys.map((key) => resolveImage(article, key)),
  ];
  for (const field of ['imageKey', 'sha256', 'sourceUrl'] as const)
    if (new Set(images.map((i) => i[field])).size !== images.length)
      throw new Error(`Duplicate slide ${field}: ${article.title}`);
  return images;
}

export function uniqueSlideCredits(article: Article): string {
  return [
    '더 읽기 · 자료 출처',
    ...article.references,
    '슬라이드 이미지 안내\n번호는 표지부터 1번입니다. 각 슬라이드에는 서로 다른 이미지를 사용했습니다. 후대 재현·현대 장소 사진·관련 인물과 제도 자료는 설명을 위한 것이며 해당 철학자의 실제 활동 장면이나 이론의 직접 증거를 뜻하지 않습니다.',
    ...uniqueSlideImages(article).map(
      (image, index) =>
        `${index + 1}번 슬라이드\n${image.caption}\n${image.creator}\n${image.sourceUrl}\n${image.license}\n${image.licenseUrl}\n${image.changes}`,
    ),
    '본문은 원전과 연구 자료를 참고해 새로 작성한 해설이며 직접 인용문이 아닙니다.',
  ].join('\n\n');
}
