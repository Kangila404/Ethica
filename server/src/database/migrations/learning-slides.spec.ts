import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { QueryRunner } from 'typeorm';
import { IllustrateLearningSlides1791007200000 } from './1791007200000-IllustrateLearningSlides';
import { articleImage, learningPostsV2 } from './content/learning-posts-v2';
import { slideCredits, slideImages } from './content/learning-slides-v3';
import { imageExtension } from '../../media/media.service';

describe('fully illustrated learning slides', () => {
  it('covers all 80 cards with verified attributed assets and preserves covers', () => {
    const assets = new Set<string>();
    expect(learningPostsV2.flatMap(slideImages)).toHaveLength(80);
    for (const article of learningPostsV2) {
      const images = slideImages(article);
      expect(images[0].imageKey).toBe(articleImage(article).imageKey);
      expect(
        new Set(images.map((i) => i.imageKey)).size,
      ).toBeGreaterThanOrEqual(2);
      const credits = slideCredits(article);
      expect(credits.length).toBeLessThan(10000);
      for (const ref of article.references) expect(credits).toContain(ref);
      for (const image of images) {
        assets.add(image.imageKey);
        const bytes = readFileSync(resolve('content-media', image.imageKey));
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(
          image.sha256,
        );
        expect(image.imageKey.endsWith('.' + imageExtension(bytes))).toBe(true);
        expect(bytes.length).toBeLessThan(2 * 1024 * 1024);
        for (const field of [
          'creator',
          'caption',
          'sourceUrl',
          'license',
          'licenseUrl',
          'changes',
        ] as const) {
          expect(image[field].length).toBeGreaterThan(0);
          expect(credits).toContain(image[field]);
        }
      }
    }
    expect(assets.size).toBe(15);
  });

  it('requires a transaction and refuses destructive rollback', async () => {
    const migration = new IllustrateLearningSlides1791007200000();
    expect(migration.transaction).toBe(true);
    await expect(
      migration.up({ isTransactionActive: false } as QueryRunner),
    ).rejects.toThrow('transaction');
    expect(() => migration.down()).toThrow('Forward-only');
  });

  it('refuses missing or ambiguous target posts before any writes', async () => {
    for (const rows of [
      [],
      [
        { id: '1', imageKey: 'x' },
        { id: '2', imageKey: 'x' },
      ],
    ]) {
      const query = jest
        .fn<Promise<unknown[]>, [string, unknown[]]>()
        .mockResolvedValue(rows);
      await expect(
        new IllustrateLearningSlides1791007200000().up({
          isTransactionActive: true,
          query,
        } as unknown as QueryRunner),
      ).rejects.toThrow('missing or changed');
      expect(query).toHaveBeenCalledTimes(1);
      expect(query.mock.calls[0][0]).toMatch(/^SELECT/);
    }
  });
});
