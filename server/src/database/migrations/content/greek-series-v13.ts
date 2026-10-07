import origins from './greek-v13.json';
import olympus from './greek-olympus-v13.json';
import encounters from './greek-olympus-end-v13.json';
import historicalImages from './greek-images-v13.json';
import generatedImages from './greek-ai-images-v13.json';
import creationPrompts from './greek-ai-prompts-v13.json';
import encounterPrompts from './greek-ai-scenes-v13.json';
import demeterPrompts from './greek-ai-demeter-v13.json';
import plan from './greek-image-plan-v13.json';

export interface GreekImage {
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

export const greekSourcesV13: Record<string, string> = {
  theogony: 'https://www.theoi.com/Text/HesiodTheogony.html',
  works: 'https://www.theoi.com/Text/HesiodWorksDays.html',
  hymns1: 'https://www.theoi.com/Text/HomericHymns1.html',
  hymns2: 'https://www.theoi.com/Text/HomericHymns2.html',
  hymns3: 'https://www.theoi.com/Text/HomericHymns3.html',
  apollodorus1: 'https://www.theoi.com/Text/Apollodorus1.html',
  apollodorus3: 'https://www.theoi.com/Text/Apollodorus3.html',
  ovid1: 'https://www.theoi.com/Text/OvidMetamorphoses1.html',
  ovid2: 'https://www.theoi.com/Text/OvidMetamorphoses2.html',
  ovid3: 'https://www.theoi.com/Text/OvidMetamorphoses3.html',
  ovid6: 'https://www.theoi.com/Text/OvidMetamorphoses6.html',
  odyssey8: 'https://www.theoi.com/Text/HomerOdyssey8.html',
};
export const greekArticlesV13 = [...origins, ...olympus, ...encounters];
export type GreekArticle = (typeof greekArticlesV13)[number];
const prompts = [...creationPrompts, ...encounterPrompts, ...demeterPrompts];
export const greekImagesV13: GreekImage[] = [
  ...historicalImages.map((image) => ({
    ...image,
    kind: 'historical' as const,
  })),
  ...generatedImages.map((image) => {
    const prompt = prompts.find((p) => p.key === image.key);
    if (!prompt) throw new Error('Missing Greek image prompt: ' + image.key);
    return {
      ...image,
      artworkId: 'ethica-greek-ai-' + image.key,
      imageKey: 'greek-v13-ai-' + image.key + '.jpg',
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

export function greekImages(article: GreekArticle) {
  const slots = (plan as Record<string, string[][]>)[article.key];
  if (!slots) throw new Error('Missing Greek image plan: ' + article.key);
  return slots.map(([key, context]) => {
    const image = greekImagesV13.find((item) => item.key === key);
    if (!image || !context) throw new Error('Missing Greek image: ' + key);
    return { ...image, context };
  });
}

export function greekImageCredit(image: GreekImage): string {
  return [
    image.caption,
    image.creator,
    image.sourceUrl,
    image.license,
    image.licenseUrl,
    image.changes,
  ]
    .filter(Boolean)
    .join('\n');
}

export function greekCredits(article: GreekArticle): string {
  return [
    '더 읽기 · 자료 출처',
    ...article.sourceSections,
    ...article.sources.map((key) => greekSourcesV13[key]),
    '원전의 공개 영역 번역을 대조하여 새로 작성한 한국어 요약입니다. 헤시오도스·호메로스 찬가: H. G. Evelyn-White(1914), 도서관: J. G. Frazer(1921), 오비디우스: Brookes More(1922), 오디세이아: A. T. Murray(1919). 현대 한국어 번역을 전재하지 않았습니다.',
    '전승과 문헌별 차이를 구별합니다. 옛 그림은 후대 해석이며 신화적 사건의 역사적 증거가 아닙니다. 직접 장면이 아닌 관련 도상과 AI 삽화는 아래에 따로 표시했습니다.',
    '이미지 출처',
    ...greekImages(article).map(
      (image, index) =>
        `${index + 1}번째 슬라이드 · ${image.context}\n${greekImageCredit(image)}`,
    ),
  ].join('\n\n');
}

const portrait = greekImagesV13.find((image) => image.key === '082')!;
export const greekProfileV13 = {
  name: '그리스·로마 신화',
  era: '고대 그리스·로마 문헌의 전승',
  school: '신화 · 지중해 전승',
  category: 'mythology',
  coreThought:
    '카오스에서 올림포스의 질서까지, 신들의 탄생과 인간의 만남을 여러 고대 문헌과 함께 읽는 신화 시리즈',
  lifeRoots: [
    '한 사람의 철학이나 창작물이 아니라 여러 시대와 지역에서 전해진 이야기의 모음입니다. 헤시오도스, 호메로스 찬가, 도서관, 오비디우스의 변신 이야기 등을 대조하며 문헌별 차이를 구별합니다.',
    '이번 첫 시리즈는 세계와 신들의 탄생, 올림포스 신들과 인간의 만남을 다룹니다. 로마의 별도 건국 서사나 트로이 전쟁 전체를 다룬 완결판은 아닙니다. 신의 그리스 이름과 로마 이름이 대응하더라도 모든 신앙과 이야기가 동일한 것은 아닙니다.',
    '[프로필 이미지]',
    greekImageCredit(portrait),
  ].join('\n\n'),
  imageKey: portrait.imageKey,
};

export function validateGreekV13(): void {
  const fail = (message: string): never => {
    throw new Error('Greek v13: ' + message);
  };
  if (
    greekArticlesV13.length !== 15 ||
    origins.length !== 5 ||
    olympus.length + encounters.length !== 10
  )
    fail('expected 5 + 10 articles');
  for (const field of ['key', 'title'] as const)
    if (new Set(greekArticlesV13.map((a) => a[field])).size !== 15)
      fail('duplicate ' + field);
  for (const field of ['key', 'imageKey', 'sha256', 'artworkId'] as const)
    if (
      new Set(greekImagesV13.map((i) => i[field])).size !==
      greekImagesV13.length
    )
      fail('duplicate catalog ' + field);
  for (const image of greekImagesV13) {
    if (
      !/^greek-v13-[a-z0-9-]+\.(jpg|png)$/.test(image.imageKey) ||
      !/^[a-f0-9]{64}$/.test(image.sha256)
    )
      fail('invalid asset identity: ' + image.key);
    if (!image.caption || !image.creator || !image.license || !image.changes)
      fail('missing attribution: ' + image.key);
    if (
      image.kind === 'historical' &&
      (!/^https:\/\/commons\.wikimedia\.org\/\?curid=\d+$/.test(
        image.sourceUrl,
      ) ||
        ![
          'Public domain',
          'CC0',
          'CC BY 2.5',
          'CC BY-SA 2.0',
          'CC BY-SA 4.0',
        ].includes(image.license) ||
        !image.licenseUrl.startsWith('https://'))
    )
      fail('unverified historical source: ' + image.key);
    if (
      image.kind === 'generated' &&
      !prompts.some((p) => p.key === image.key && p.reason && p.prompt)
    )
      fail('missing AI provenance: ' + image.key);
  }
  for (const [index, article] of greekArticlesV13.entries()) {
    if (
      article.key !== `greek-${String(index + 1).padStart(2, '0')}` ||
      article.title.length > 255
    )
      fail('invalid article order/title');
    if (
      article.cards.length !== 12 ||
      !article.sourceSections.length ||
      !article.sources.length ||
      article.sources.some((key) => !greekSourcesV13[key])
    )
      fail('invalid body/source: ' + article.key);
    for (const body of article.cards)
      if (
        body.length < 45 ||
        body.length > 650 ||
        !body.includes('\n') ||
        /\uFFFD|TODO|TBD|\?{3}/i.test(body)
      )
        fail('invalid card: ' + article.key);
    const images = greekImages(article);
    if (images.length !== article.cards.length + 2)
      fail('missing slide image: ' + article.key);
    for (const field of ['imageKey', 'sha256', 'artworkId'] as const)
      if (new Set(images.map((i) => i[field])).size !== images.length)
        fail('repeated artwork in ' + article.key);
    if (greekCredits(article).length > 10000)
      fail('credits exceed column limit: ' + article.key);
  }
}
