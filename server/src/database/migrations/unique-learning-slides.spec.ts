import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { QueryRunner } from 'typeorm';
import { UniqueLearningSlideImages1791010800000 } from './1791010800000-UniqueLearningSlideImages';
import { articleImage, learningPostsV2 } from './content/learning-posts-v2';
import { slideCredits, slideImages } from './content/learning-slides-v3';
import {
  uniqueSlideCredits,
  uniqueSlideImages,
} from './content/learning-slides-v4';
import { imageExtension } from '../../media/media.service';

function originalRows() {
  return learningPostsV2.map((article, p) => ({
    post: { id: String(p + 6), imageKey: articleImage(article).imageKey },
    cards: slideImages(article).map((image, i) => ({
      id: String(p * 8 + i + 100),
      position: i,
      kind: i === 0 ? 'image' : 'text',
      imageKey: image.imageKey,
      body:
        i === 0 ? null : i === 7 ? slideCredits(article) : article.cards[i - 1],
    })),
  }));
}

describe('unique learning slide replacement', () => {
  it('has eight distinct verified images per post with all sources and original covers', () => {
    const assets = new Set<string>();
    expect(learningPostsV2.flatMap(uniqueSlideImages)).toHaveLength(80);
    for (const article of learningPostsV2) {
      const images = uniqueSlideImages(article);
      for (const field of ['imageKey', 'sha256', 'sourceUrl'] as const)
        expect(new Set(images.map((i) => i[field])).size).toBe(8);
      expect(images[0].imageKey).toBe(articleImage(article).imageKey);
      const credits = uniqueSlideCredits(article);
      expect(credits.length).toBeLessThan(10000);
      expect(credits).not.toContain('같은 자료를 여러 슬라이드');
      for (const reference of article.references)
        expect(credits).toContain(reference);
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
    expect(assets.size).toBe(53);
  });

  it('requires a transaction and refuses destructive rollback', async () => {
    const migration = new UniqueLearningSlideImages1791010800000();
    expect(migration.transaction).toBe(true);
    await expect(
      migration.up({ isTransactionActive: false } as QueryRunner),
    ).rejects.toThrow('transaction');
    expect(() => migration.down()).toThrow('Forward-only');
  });

  it('checks the whole batch before writing, preserves prose and only updates changed cards', async () => {
    const rows = originalRows();
    const query = jest.fn(async (sql: string, params: unknown[]) => {
      if (sql.includes('FROM post p'))
        return [
          rows[learningPostsV2.findIndex((a) => a.title === params[0])].post,
        ];
      if (sql.includes('FROM post_segment'))
        return rows.find((r) => r.post.id === params[0])!.cards;
      return [];
    });
    await new UniqueLearningSlideImages1791010800000().up({
      isTransactionActive: true,
      query,
    } as unknown as QueryRunner);
    expect(
      query.mock.calls.slice(0, 20).every(([sql]) => sql.startsWith('SELECT')),
    ).toBe(true);
    const writes = query.mock.calls.slice(20);
    expect(writes.length).toBeGreaterThan(50);
    for (const [sql, params] of writes) {
      expect(sql).toBe(
        'UPDATE post_segment SET image_key = ?, body = ? WHERE id = ?',
      );
      const row = rows.find((r) => r.cards.some((c) => c.id === params[2]))!;
      const card = row.cards.find((c) => c.id === params[2])!;
      const article = learningPostsV2[rows.indexOf(row)];
      expect(card.position).not.toBe(0);
      expect(params[0]).toBe(
        uniqueSlideImages(article)[card.position].imageKey,
      );
      expect(params[1]).toBe(
        card.position === 7 ? uniqueSlideCredits(article) : card.body,
      );
    }
  });

  it.each(['body', 'imageKey', 'position', 'kind'] as const)(
    'refuses even a last-card %s edit before any write',
    async (field) => {
      const rows = originalRows();
      const final = rows[rows.length - 1].cards[7];
      if (field === 'position') final.position = 999;
      else final[field] = 'operator edit';
      const query = jest.fn(async (sql: string, params: unknown[]) =>
        sql.includes('FROM post p')
          ? [rows[learningPostsV2.findIndex((a) => a.title === params[0])].post]
          : rows.find((r) => r.post.id === params[0])!.cards,
      );
      await expect(
        new UniqueLearningSlideImages1791010800000().up({
          isTransactionActive: true,
          query,
        } as unknown as QueryRunner),
      ).rejects.toThrow('Learning cards changed');
      expect(query.mock.calls.every(([sql]) => sql.startsWith('SELECT'))).toBe(
        true,
      );
    },
  );
});
