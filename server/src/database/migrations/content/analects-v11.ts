import books from './analects-books-v11.json';
import portraits from './thinker-portraits-v1.json';
import previous from './learning-images-v5.json';
import additions from './learning-images-v8.json';
import { LibraryArticle } from './learning-library-v5';
import { SlideImage } from './learning-slides-v3';

export const analectsBooksV11 = books;
export const analectsArticlesV11: readonly LibraryArticle[] = books.map(
  (b) => ({
    key: b.key,
    philosopher: 'confucius',
    title: b.title,
    cards: [
      ...b.introduction,
      ...b.passages.flatMap((p, i) => [
        `핵심 구절 ${i + 1} · 원문과 독음\n${p.locator}\n발화·서술: ${p.speaker}\n${p.quote}\n독음: ${p.reading}`,
        `핵심 구절 ${i + 1} · 한자와 뜻\n${p.gloss}\n뜻풀이: ${p.meaning}`,
        p.explanation,
      ]),
      ...b.conclusion,
    ],
    references: [
      `《논어》 ${b.sourcePage} — ${b.passages.map((p) => p.locator).join(' / ')}`,
      `https://zh.wikisource.org/w/index.php?title=論語/${b.sourcePage}&oldid=${b.sourceRevision}`,
      '원전 대조일: 2026-10-05. 고대 원문은 공공영역. 문장부호는 독서를 위해 정리했습니다. 장 번호는 판본에 따라 달라 첫 구절로 위치를 표시합니다. 현대 번역을 전재하지 않고 한국어 뜻풀이와 해설을 새로 썼습니다. 각 편의 선별 세 구절이며 전편 완역은 아닙니다.',
    ],
  }),
);

export function remainingAnalectsImages(article: LibraryArticle): SlideImage[] {
  const b = books.find((book) => book.key === article.key);
  if (!b || b.images.length !== article.cards.length + 2)
    throw new Error('Incomplete remaining Analects images: ' + article.key);
  const images = b.images.map((ref): SlideImage => {
    const [collection, key] = ref.split(':');
    if (collection === 'p') {
      const p = portraits.find((i) => i.key === key);
      if (!p) throw new Error('Missing Analects portrait: ' + ref);
      return { ...p, caption: p.note };
    }
    const catalog = collection === 'v' ? previous : additions;
    const img = catalog.find(
      (i) => i.key === (key === 'teaching' ? 'confucius-teaching' : key),
    );
    if (!img) throw new Error('Missing Analects image: ' + ref);
    return img;
  });
  for (const field of ['imageKey', 'sha256', 'sourceUrl'] as const)
    if (new Set(images.map((i) => i[field])).size !== images.length)
      throw new Error('Repeated Analects original: ' + article.key);
  return images;
}

export function remainingAnalectsCredits(article: LibraryArticle): string {
  const text = [
    '더 읽기 · 자료 출처',
    ...article.references,
    '이미지 안내\n고대 유물은 문자·의례·정치 문화의 맥락 자료입니다. 후대의 회화·초상·판본 및 현대의 공묘 사진은 공자 당시의 현장 기록이 아닙니다. 도판은 본문의 사건을 직접 촬영하거나 재현한 자료라는 뜻이 아닙니다. 한 글 안에서 원본을 반복하지 않았으며 AI 생성 이미지는 쓰지 않았습니다.',
    ...remainingAnalectsImages(article).map(
      (i, n) =>
        `${n + 1}번 슬라이드\n${i.caption}\n${i.creator}\n${i.sourceUrl}\n${i.license}\n${i.licenseUrl}\n${i.changes}`,
    ),
  ].join('\n\n');
  if (text.length > 10000) throw new Error('Analects credits too long');
  return text;
}
