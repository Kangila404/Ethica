import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { QueryRunner } from 'typeorm';
import { PublishGreekMythology1791504000000 } from './1791504000000-PublishGreekMythology';
import {
  greekArticlesV13,
  greekImages,
  greekImagesV13,
  greekCredits,
  greekProfileV13,
  validateGreekV13,
} from './content/greek-series-v13';
import { imageExtension } from '../../media/media.service';

describe('Greek mythology v13 publication batch', () => {
  function runner(collision: 'profile' | 'title' | null = null) {
    let id = 1000;
    const query = jest.fn((sql: string, params: unknown[] = []) => {
      if (sql.includes('FROM philosopher'))
        return Promise.resolve(collision === 'profile' ? [{ id: '99' }] : []);
      if (sql.includes('FROM post'))
        return Promise.resolve(
          collision === 'title' && params[0] === greekArticlesV13.at(-1)!.title
            ? [{ id: '99' }]
            : [],
        );
      if (sql.includes('LAST_INSERT_ID'))
        return Promise.resolve([{ id: String(++id) }]);
      return Promise.resolve([]);
    });
    return { query, isTransactionActive: true };
  }

  it('has 15 ordered posts, 180 body cards, 210 illustrated slides and a mythology profile', () => {
    expect(() => validateGreekV13()).not.toThrow();
    expect(greekArticlesV13).toHaveLength(15);
    expect(greekArticlesV13.flatMap((a) => a.cards)).toHaveLength(180);
    expect(greekArticlesV13.flatMap(greekImages)).toHaveLength(210);
    expect(greekProfileV13.category).toBe('mythology');
    expect(greekProfileV13.lifeRoots).toContain(
      '한 사람의 철학이나 창작물이 아니라',
    );
  });

  it('has real valid binaries and per-post unique artwork, files and hashes, with complete credits', () => {
    const checked = new Set<string>();
    for (const article of greekArticlesV13) {
      const images = greekImages(article);
      const credit = greekCredits(article);
      for (const field of ['artworkId', 'imageKey', 'sha256'] as const)
        expect(new Set(images.map((image) => image[field])).size).toBe(14);
      for (const image of images) {
        for (const field of [
          'caption',
          'creator',
          'license',
          'changes',
          'context',
        ] as const)
          expect(credit).toContain(image[field]);
        if (image.kind === 'historical') {
          expect(credit).toContain(image.sourceUrl);
          expect(credit).toContain(image.licenseUrl);
        } else {
          expect(image.license).toContain('AI 생성');
          expect(image.sourceUrl).toBe('');
        }
        if (checked.has(image.imageKey)) continue;
        const bytes = readFileSync(resolve('content-media', image.imageKey));
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(
          image.sha256,
        );
        expect(image.imageKey.endsWith('.' + imageExtension(bytes))).toBe(true);
        checked.add(image.imageKey);
      }
    }
    expect(checked.has(greekProfileV13.imageKey)).toBe(true);
    expect(greekImagesV13.filter((i) => i.kind === 'generated')).toHaveLength(
      15,
    );
  });

  it('preflights every title before writing, adds only the profile/category/posts/segments', async () => {
    const r = runner();
    await new PublishGreekMythology1791504000000().up(
      r as unknown as QueryRunner,
    );
    expect(
      r.query.mock.calls.slice(0, 16).every(([s]) => s.startsWith('SELECT')),
    ).toBe(true);
    const writes = r.query.mock.calls.filter(([s]) => !s.startsWith('SELECT'));
    expect(writes).toHaveLength(227);
    expect(
      writes.every(([s]) =>
        /^INSERT INTO (philosopher|learning_profile_category|post|post_segment) \(/.test(
          s,
        ),
      ),
    ).toBe(true);
    const posts = writes.filter(([s]) => s.startsWith('INSERT INTO post ('));
    expect(posts).toHaveLength(15);
    expect(posts.every(([, p]) => p[3] === 'published')).toBe(true);
    const slides = writes.filter(([s]) =>
      s.startsWith('INSERT INTO post_segment'),
    );
    expect(slides).toHaveLength(210);
    for (const [index, article] of greekArticlesV13.entries()) {
      const group = slides.slice(index * 14, (index + 1) * 14);
      expect(group.map(([, p]) => p[2])).toEqual([
        null,
        ...article.cards,
        greekCredits(article),
      ]);
      expect(group.map(([, p]) => p[3])).toEqual(
        greekImages(article).map((i) => i.imageKey),
      );
      expect(group.map(([, p]) => p[4])).toEqual(
        Array.from({ length: 14 }, (_, i) => i),
      );
    }
  });

  it.each(['profile', 'title'] as const)(
    'stops before any write on a %s collision',
    async (collision) => {
      const r = runner(collision);
      await expect(
        new PublishGreekMythology1791504000000().up(
          r as unknown as QueryRunner,
        ),
      ).rejects.toThrow('already exists');
      expect(r.query.mock.calls.every(([s]) => s.startsWith('SELECT'))).toBe(
        true,
      );
    },
  );

  it('rejects a renamed copy of an original within a post', () => {
    const original = greekImagesV13.find((i) => i.key === 'hidden-children')!;
    const prior = original.artworkId;
    try {
      original.artworkId = greekImagesV13.find(
        (i) => i.key === 'rhea-plan',
      )!.artworkId;
      expect(() => validateGreekV13()).toThrow('duplicate catalog artworkId');
    } finally {
      original.artworkId = prior;
    }
  });

  it('rejects a checksum mismatch before any database access', async () => {
    const image = greekImagesV13.find((i) => i.key === '082')!;
    const prior = image.sha256;
    const r = runner();
    try {
      image.sha256 = '0'.repeat(64);
      await expect(
        new PublishGreekMythology1791504000000().up(
          r as unknown as QueryRunner,
        ),
      ).rejects.toThrow('checksum mismatch');
      expect(r.query).not.toHaveBeenCalled();
    } finally {
      image.sha256 = prior;
    }
  });

  it('rejects missing media before any database access', async () => {
    const prior = process.env.MEDIA_CONTENT_DIRECTORY;
    const r = runner();
    try {
      process.env.MEDIA_CONTENT_DIRECTORY = resolve(
        'content-media',
        'nonexistent-greek-test',
      );
      await expect(
        new PublishGreekMythology1791504000000().up(
          r as unknown as QueryRunner,
        ),
      ).rejects.toThrow();
      expect(r.query).not.toHaveBeenCalled();
    } finally {
      if (prior === undefined) delete process.env.MEDIA_CONTENT_DIRECTORY;
      else process.env.MEDIA_CONTENT_DIRECTORY = prior;
    }
  });

  it('requires TypeORM transaction ownership, and refuses destructive rollback', async () => {
    const migration = new PublishGreekMythology1791504000000();
    expect(migration.transaction).toBe(true);
    await expect(
      migration.up({ isTransactionActive: false } as QueryRunner),
    ).rejects.toThrow('transaction');
    expect(() => migration.down()).toThrow('Forward-only');
  });
});
