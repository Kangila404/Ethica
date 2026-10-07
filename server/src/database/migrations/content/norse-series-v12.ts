import manuscript from './norse-v12.json';
import historicalImages from './norse-images-v12.json';
import generatedImages from './norse-ai-images-v12.json';
import prompts from './norse-ai-prompts-v12.json';
import plan from './norse-image-plan-v12.json';

export interface NorseImage {
  key: string;
  artworkId: string;
  imageKey: string;
  sha256: string;
  caption: string;
  creator: string;
  kind: 'historical' | 'generated';
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  changes: string;
}
export const norseSourcesV12 = {
  prose: 'https://www.gutenberg.org/cache/epub/18947/pg18947-images.html',
  poetic: 'https://www.gutenberg.org/cache/epub/14726/pg14726-images.html',
  ynglinga:
    'https://is.wikisource.org/w/index.php?title=Heimskringla/Ynglinga_saga/4&oldid=25463',
};
export const norseArticlesV12 = manuscript;
export type NorseArticle = (typeof manuscript)[number];
export const norseImagesV12: NorseImage[] = [
  ...historicalImages.map((image) => ({
    ...image,
    kind: 'historical' as const,
  })),
  ...generatedImages.map((image) => {
    const prompt = prompts.find((p) => p.key === image.key);
    if (!prompt) throw new Error('Missing Norse image prompt: ' + image.key);
    return {
      ...image,
      artworkId: 'ethica-norse-ai-' + image.key,
      imageKey: 'norse-v12-ai-' + image.key + '.jpg',
      caption: prompt.caption,
      creator: 'Ethica · OpenAI imagegen · 2026-10-07',
      kind: 'generated' as const,
      sourceUrl: '',
      license: 'AI 생성 삽화 · 역사적 원본이나 퍼블릭 도메인 작품이 아님',
      licenseUrl: '',
      changes:
        '현대적 상상으로 생성한 원본을 JPEG로 변환. 문헌의 고증 복원도가 아님.',
    };
  }),
];

export function norseImages(article: NorseArticle) {
  const slots = (plan as Record<string, string[][]>)[article.key];
  if (!slots) throw new Error('Missing Norse image plan: ' + article.key);
  return slots.map(([key, context]) => {
    const image = norseImagesV12.find((item) => item.key === key);
    if (!image || !context) throw new Error('Missing Norse image: ' + key);
    return { ...image, context };
  });
}

export function norseImageCredit(image: NorseImage): string {
  return [
    image.caption,
    image.creator,
    image.sourceUrl,
    image.license,
    // Explicit license section, including for long Unicode file-page URLs.
    image.licenseUrl,
    image.changes,
  ]
    .filter(Boolean)
    .join('\n');
}

export function norseCredits(article: NorseArticle): string {
  return [
    '더 읽기 · 자료 출처',
    ...article.sourceSections,
    ...(article.sourceSections.some((s) => s.includes('산문 에다'))
      ? [
          '《산문 에다》 Rasmus B. Anderson의 공개 영역 번역. 서문과 본문은 구별해 읽었습니다.',
          norseSourcesV12.prose,
        ]
      : []),
    ...(article.sourceSections.some((s) => s.includes('시 에다'))
      ? [
          '《시 에다》 Benjamin Thorpe의 공개 영역 번역. 판본에 따라 연 번호가 다릅니다.',
          norseSourcesV12.poetic,
        ]
      : []),
    ...(article.key === 'norse-05'
      ? [
          '〈윙글링가 사가〉 4장 원문. 신들을 역사 속 인물처럼 서술하는 별도 전승입니다.',
          norseSourcesV12.ynglinga,
        ]
      : []),
    '본문은 위 자료를 바탕으로 새로 작성한 한국어 요약입니다. 현대 한국어 번역을 전재하지 않았습니다. 전승별 차이는 하나의 확정 연표로 합치지 않았습니다.',
    '이미지 출처',
    '옛 그림은 후대 작가의 해석이며 바이킹 시대의 실제 장면을 기록한 자료가 아닙니다. 직접 묘사가 아닌 관련 도상은 아래에 구분했습니다. AI 삽화는 별도로 표시했습니다.',
    ...norseImages(article).map(
      (image, index) =>
        `${index + 1}번째 슬라이드 · ${image.context}\n${norseImageCredit(image)}`,
    ),
  ].join('\n\n');
}

const portrait = norseImagesV12.find((image) => image.key === '102')!;
export const norseProfileV12 = {
  name: '북유럽 신화',
  era: '중세 아이슬란드 문헌에 전해진 전승',
  school: '신화 · 에다 전승',
  category: 'mythology',
  coreThought:
    '긴눙가가프에서 라그나로크와 새 세계까지, 여러 전승과 에다 문헌을 바탕으로 읽는 북유럽 신화 시리즈',
  lifeRoots: [
    '한 사람의 철학이나 창작물이 아니라 여러 시대에 전해진 신화의 모음입니다. 익명의 시들을 모은 《시 에다》와 스노리 스투를루손의 《산문 에다》를 중심으로 읽되, 두 문헌의 차이와 후대의 해석을 구분합니다.',
    '스노리가 북유럽 신화 전체를 창작한 것은 아닙니다. 살아 있는 구전 전통이 중세의 문헌에 기록된 것이므로, 신들의 가족관계와 사건 순서가 모든 자료에서 일치하지는 않습니다.',
    '[프로필 이미지]',
    norseImageCredit(portrait),
  ].join('\n\n'),
  imageKey: portrait.imageKey,
};

export function validateNorseV12(): void {
  const fail = (message: string): never => {
    throw new Error('Norse v12: ' + message);
  };
  if (manuscript.length !== 18) fail('expected 18 articles');
  for (const field of ['key', 'title'] as const)
    if (new Set(manuscript.map((a) => a[field])).size !== 18)
      fail('duplicate ' + field);
  for (const field of ['key', 'imageKey', 'sha256', 'artworkId'] as const)
    if (
      new Set(norseImagesV12.map((i) => i[field])).size !==
      norseImagesV12.length
    )
      fail('duplicate catalog ' + field);
  for (const image of norseImagesV12) {
    if (
      !/^[a-z0-9-]+\.(jpg|png)$/.test(image.imageKey) ||
      !/^[a-f0-9]{64}$/.test(image.sha256)
    )
      fail('invalid asset identity: ' + image.key);
    if (!image.caption || !image.creator || !image.license || !image.changes)
      fail('missing attribution: ' + image.key);
    if (
      image.kind === 'historical' &&
      (!image.sourceUrl.startsWith(
        'https://commons.wikimedia.org/wiki/File:',
      ) ||
        image.license !== 'Public domain' ||
        !image.licenseUrl.endsWith('#Licensing'))
    )
      fail('unverified historical source: ' + image.key);
    if (
      image.kind === 'generated' &&
      !prompts.some((p) => p.key === image.key && p.reason && p.prompt)
    )
      fail('missing AI provenance: ' + image.key);
  }
  for (const [index, article] of manuscript.entries()) {
    if (
      article.key !== `norse-${String(index + 1).padStart(2, '0')}` ||
      article.title.length > 255
    )
      fail('invalid article order/title');
    if (article.cards.length !== 12 || !article.sourceSections.length)
      fail('invalid body: ' + article.key);
    for (const body of article.cards)
      if (
        body.length < 45 ||
        body.length > 650 ||
        !body.includes('\n') ||
        /\uFFFD|TODO|TBD|\?{3}/i.test(body)
      )
        fail('invalid card: ' + article.key);
    const images = norseImages(article);
    if (images.length !== article.cards.length + 2)
      fail('missing slide image: ' + article.key);
    for (const field of ['imageKey', 'sha256', 'artworkId'] as const)
      if (new Set(images.map((i) => i[field])).size !== images.length)
        fail('repeated artwork in ' + article.key);
    if (norseCredits(article).length > 10000)
      fail('credits exceed column limit: ' + article.key);
  }
}
