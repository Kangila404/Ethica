import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { QueryRunner } from 'typeorm';
import { PublishCollectedWorks1791172800000 } from './1791172800000-PublishCollectedWorks';
import {
  collectedWorksV11,
  collectedImages,
  collectedCredits,
  validateCollectedWorks,
} from './content/collected-works-v11';
import { analectsBooksV11, analectsArticlesV11 } from './content/analects-v11';
import { imageExtension } from '../../media/media.service';

describe('Collected publication v11', () => {
  it('publishes exact snapshots of both previously reviewed draft batches', () => {
    for (const batch of ['major-works-v9', 'nietzsche-v10']) {
      const source = JSON.parse(
        readFileSync(resolve('content-batches', batch, 'posts.json'), 'utf8'),
      ) as {
        posts: Array<{
          key: string;
          title: string;
          philosopherKey: string;
          segments: Array<{ body: string | null; imageKey: string }>;
        }>;
      };
      for (const draft of source.posts) {
        const article = collectedWorksV11.find((a) => a.key === draft.key)!;
        expect(article.title).toBe(draft.title);
        expect(article.philosopher).toBe(draft.philosopherKey);
        expect([null, ...article.cards, collectedCredits(article)]).toEqual(
          draft.segments.map((s) => s.body),
        );
        expect(collectedImages(article).map((i) => i.imageKey)).toEqual(
          draft.segments.map((s) => s.imageKey),
        );
      }
    }
  });
  function runner(collision = false, ambiguous = false) {
    let id = 1000;
    const query = jest.fn((sql: string, params: unknown[] = []) => {
      if (sql.includes('FROM philosopher'))
        return Promise.resolve(
          ambiguous ? [{ id: '1' }, { id: '2' }] : [{ id: '1' }],
        );
      if (sql.includes('FROM post'))
        return Promise.resolve(
          collision && params[1] === collectedWorksV11.at(-1)!.title
            ? [{ id: '999' }]
            : [],
        );
      if (sql.includes('LAST_INSERT_ID'))
        return Promise.resolve([{ id: String(++id) }]);
      return Promise.resolve([]);
    });
    return { isTransactionActive: true, query };
  }
  it('preflights every thinker and all 42 titles before 774 insertions', async () => {
    const r = runner();
    await new PublishCollectedWorks1791172800000().up(
      r as unknown as QueryRunner,
    );
    expect(
      r.query.mock.calls.slice(0, 48).every(([s]) => s.startsWith('SELECT')),
    ).toBe(true);
    const writes = r.query.mock.calls.filter(([s]) => !s.startsWith('SELECT'));
    expect(writes).toHaveLength(774);
    expect(writes.every(([s]) => s.startsWith('INSERT INTO post'))).toBe(true);
    const posts = writes.filter(([s]) => s.startsWith('INSERT INTO post ('));
    expect(posts).toHaveLength(42);
    expect(posts.every(([, p]) => p[3] === 'published')).toBe(true);
    const cards = writes.filter(([s]) =>
      s.startsWith('INSERT INTO post_segment'),
    );
    let offset = 0;
    for (const a of collectedWorksV11) {
      const images = collectedImages(a),
        group = cards.slice(offset, offset + images.length);
      expect(group.map(([, p]) => p[4])).toEqual(images.map((_, i) => i));
      expect(group.map(([, p]) => p[2])).toEqual([
        null,
        ...a.cards,
        collectedCredits(a),
      ]);
      expect(group.map(([, p]) => p[3])).toEqual(images.map((i) => i.imageKey));
      offset += images.length;
    }
    expect(
      r.query.mock.calls.some(
        ([, p]) => p.includes('이마누엘 칸트') && p.includes('임마누엘 칸트'),
      ),
    ).toBe(true);
  });
  it.each([
    [true, false],
    [false, true],
  ])(
    'fails without writes on collision or ambiguous profile',
    async (collision, ambiguous) => {
      const r = runner(collision, ambiguous);
      await expect(
        new PublishCollectedWorks1791172800000().up(
          r as unknown as QueryRunner,
        ),
      ).rejects.toThrow(/already exists|ambiguous/);
      expect(r.query.mock.calls.every(([s]) => s.startsWith('SELECT'))).toBe(
        true,
      );
    },
  );
  it('requires a transaction and has no destructive rollback', async () => {
    const m = new PublishCollectedWorks1791172800000();
    expect(m.transaction).toBe(true);
    await expect(
      m.up({ isTransactionActive: false } as QueryRunner),
    ).rejects.toThrow('transaction');
    expect(() => m.down()).toThrow('Forward-only');
  });
  it('performs no DB queries when bundled assets are missing', async () => {
    const prior = process.env.MEDIA_CONTENT_DIRECTORY,
      r = runner();
    try {
      process.env.MEDIA_CONTENT_DIRECTORY = resolve(
        'content-media',
        'nonexistent-collected-test',
      );
      await expect(
        new PublishCollectedWorks1791172800000().up(
          r as unknown as QueryRunner,
        ),
      ).rejects.toThrow();
      expect(r.query).not.toHaveBeenCalled();
    } finally {
      if (prior === undefined) delete process.env.MEDIA_CONTENT_DIRECTORY;
      else process.env.MEDIA_CONTENT_DIRECTORY = prior;
    }
  });
  it('validates 42 posts and every image original, attribution and binary', () => {
    expect(() => validateCollectedWorks()).not.toThrow();
    expect(collectedWorksV11.flatMap(collectedImages)).toHaveLength(732);
    const checked = new Set<string>();
    for (const a of collectedWorksV11) {
      const images = collectedImages(a),
        credits = collectedCredits(a);
      for (const field of ['imageKey', 'sha256', 'sourceUrl'] as const)
        expect(new Set(images.map((i) => i[field])).size).toBe(images.length);
      for (const img of images) {
        for (const field of [
          'creator',
          'caption',
          'sourceUrl',
          'license',
          'licenseUrl',
          'changes',
        ] as const) {
          expect(img[field]).toBeTruthy();
          expect(credits).toContain(img[field]);
        }
        if (checked.has(img.imageKey)) continue;
        const bytes = readFileSync(resolve('content-media', img.imageKey));
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(
          img.sha256,
        );
        expect(img.imageKey.endsWith('.' + imageExtension(bytes))).toBe(true);
        checked.add(img.imageKey);
      }
    }
  });
  it('completes books 11–20 with 30 attributable passages and 140 body cards', () => {
    expect(analectsBooksV11.map((b) => b.key)).toEqual(
      Array.from({ length: 10 }, (_, i) => `analects-${i + 11}`),
    );
    expect(analectsArticlesV11.flatMap((a) => a.cards)).toHaveLength(140);
    for (const b of analectsBooksV11) {
      expect(b.passages).toHaveLength(3);
      expect(b.sourceRevision).toBeGreaterThan(0);
      for (const p of b.passages) {
        expect(p.reading).toMatch(/[가-힣]/);
        expect(p.gloss).toContain('(');
        expect(p.speaker).toBeTruthy();
      }
    }
    expect(analectsBooksV11[7].passages[1].speaker).toBe('자로');
    expect(analectsBooksV11[8].passages.map((p) => p.speaker)).toEqual([
      '자하',
      '자하',
      '자공',
    ]);
    expect(analectsBooksV11[9].passages[0].speaker).toContain('요가 순에게');
    for (const a of analectsArticlesV11)
      for (const body of a.cards) {
        expect(body.length).toBeGreaterThan(45);
        expect(body.length).toBeLessThan(650);
      }
  });
});
