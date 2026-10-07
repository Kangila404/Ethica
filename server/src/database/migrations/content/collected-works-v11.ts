import major from './major-works-v9-published.json';
import nietzsche from './nietzsche-v10-published.json';
import majorImages from './major-works-v9-published-images.json';
import nietzscheImages from './nietzsche-v10-published-images.json';
import { LibraryArticle } from './learning-library-v5';
import { SlideImage } from './learning-slides-v3';
import {
  analectsArticlesV11,
  remainingAnalectsCredits,
  remainingAnalectsImages,
} from './analects-v11';

// Frozen publication snapshots of previously reviewed local draft batches.
// Publication approved 2026-10-05; old published content is never rewritten.
const staged = [...major, ...nietzsche];
export const collectedWorksV11: readonly LibraryArticle[] = [
  ...staged,
  ...analectsArticlesV11,
];

export function collectedImages(article: LibraryArticle): SlideImage[] {
  const post = staged.find((p) => p.key === article.key);
  if (!post) return remainingAnalectsImages(article);
  const catalog = major.some((p) => p.key === post.key)
    ? majorImages
    : nietzscheImages;
  return post.imageKeys.map((key) => {
    const image = catalog.find((i) => i.imageKey === key);
    if (!image) throw new Error('Missing collected image: ' + key);
    return image;
  });
}
export function collectedCredits(article: LibraryArticle): string {
  const post = staged.find((p) => p.key === article.key);
  return post ? post.credits : remainingAnalectsCredits(article);
}

export function validateCollectedWorks(): void {
  if (
    collectedWorksV11.length !== 42 ||
    new Set(collectedWorksV11.map((p) => p.key)).size !== 42 ||
    new Set(collectedWorksV11.map((p) => p.title)).size !== 42
  )
    throw new Error('Invalid collected batch identity');
  let count = 0;
  for (const article of collectedWorksV11) {
    const images = collectedImages(article);
    const credits = collectedCredits(article);
    if (
      !article.title ||
      article.title.length > 255 ||
      images.length !== article.cards.length + 2 ||
      images.length > 40
    )
      throw new Error('Invalid collected article shape: ' + article.key);
    if (!credits.startsWith('더 읽기 · 자료 출처') || credits.length > 10000)
      throw new Error('Invalid collected credits: ' + article.key);
    for (const body of article.cards)
      if (!body || body.length > 10000 || /\uFFFD|TODO|TBD/.test(body))
        throw new Error('Invalid collected card: ' + article.key);
    for (const field of ['imageKey', 'sha256', 'sourceUrl'] as const)
      if (new Set(images.map((i) => i[field])).size !== images.length)
        throw new Error('Repeated collected image: ' + article.key);
    // These two filenames are different crops of Raphael's same painting.
    const families = images.map((i) =>
      /learning-v5-school-athens|learning-v3-aristotle-raphael/.test(i.imageKey)
        ? 'raphael-school-athens'
        : i.sourceUrl,
    );
    if (new Set(families).size !== images.length)
      throw new Error('Repeated original work: ' + article.key);
    count += images.length;
  }
  if (count !== 732) throw new Error('Invalid collected slide count');
}
