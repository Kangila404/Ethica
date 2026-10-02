import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { QueryRunner } from 'typeorm';
import { ReplaceLearningPosts1791003600000 } from './1791003600000-ReplaceLearningPosts';
import {
  learningPostsV2,
  articleImage,
  articleCredits,
} from './content/learning-posts-v2';
import { imageExtension } from '../../media/media.service';

describe('biography and theory learning batch', () => {
  it('contains exactly two ordered articles for each of the five approved thinkers', () => {
    expect(learningPostsV2.map((p) => p.philosopher)).toEqual([
      'kant',
      'kant',
      'mill',
      'mill',
      'aristotle',
      'aristotle',
      'epictetus',
      'epictetus',
      'rawls',
      'rawls',
    ]);
    expect(new Set(learningPostsV2.map((p) => p.title)).size).toBe(10);
    for (const [index, post] of learningPostsV2.entries()) {
      expect(post.kind).toBe(index % 2 === 0 ? 'life' : 'theory');
      expect(post.title.length).toBeLessThan(255);
      expect(post.cards).toHaveLength(6);
      for (const card of post.cards) {
        expect(card.length).toBeGreaterThan(70);
        expect(card.length).toBeLessThan(300);
      }
      expect(post.references.length).toBeGreaterThan(0);
      const image = articleImage(post);
      const bytes = readFileSync(resolve('content-media', image.imageKey));
      expect(image.imageKey.endsWith('.' + imageExtension(bytes))).toBe(true);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(
        image.sha256,
      );
      expect(bytes.length).toBeLessThan(2 * 1024 * 1024);
      expect(image.sourceUrl).toMatch(
        /^https:\/\/commons.wikimedia.org\/wiki\/File:/,
      );
      expect(articleCredits(post)).toContain(image.creator);
      expect(articleCredits(post)).toContain(image.sourceUrl);
      expect(articleCredits(post)).toContain(image.licenseUrl);
      expect(articleCredits(post).length).toBeLessThan(10000);
    }
  });

  it('requires an active transaction and disallows destructive rollback', async () => {
    const migration = new ReplaceLearningPosts1791003600000();
    expect(migration.transaction).toBe(true);
    await expect(
      migration.up({ isTransactionActive: false } as QueryRunner),
    ).rejects.toThrow('transaction');
    expect(() => migration.down()).toThrow('Forward-only');
  });

  it('rejects missing assets before SQL', async () => {
    const previous = process.env.MEDIA_CONTENT_DIRECTORY;
    process.env.MEDIA_CONTENT_DIRECTORY = resolve(
      'missing-learning-test-assets',
    );
    const query = jest.fn();
    try {
      await expect(
        new ReplaceLearningPosts1791003600000().up({
          isTransactionActive: true,
          query,
        } as unknown as QueryRunner),
      ).rejects.toThrow();
      expect(query).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.MEDIA_CONTENT_DIRECTORY;
      else process.env.MEDIA_CONTENT_DIRECTORY = previous;
    }
  });

  it('rejects an ambiguous philosopher before any writes', async () => {
    const query = jest
      .fn<Promise<Array<{ id: string }>>, [string, unknown[]]>()
      .mockResolvedValue([{ id: '1' }, { id: '2' }]);
    await expect(
      new ReplaceLearningPosts1791003600000().up({
        isTransactionActive: true,
        query,
      } as unknown as QueryRunner),
    ).rejects.toThrow('ambiguous');
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toMatch(/^SELECT/);
  });
});
