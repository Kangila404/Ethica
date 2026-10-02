import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { learningStoriesV6 } from './content/learning-stories-v6';
import { learningLibraryV5 } from './content/learning-library-v5';
import { learningPostsV2 } from './content/learning-posts-v2';
import {
  storyCredits,
  storyImages,
} from './content/learning-stories-images-v6';
import { imageExtension } from '../../media/media.service';
import additions from './content/learning-images-v6.json';
import { QueryRunner } from 'typeorm';
import { PublishPhilosopherStories1791028800000 } from './1791028800000-PublishPhilosopherStories';
import { thinkerProfilesV1 } from './content/thinker-profiles-v1';

describe('four philosophers: anecdotes and ideas', () => {
  function runner(collision = false, ambiguous = false) {
    let id = 1000;
    const query = jest.fn((sql: string, params: unknown[] = []) => {
      if (sql.includes('FROM philosopher'))
        return Promise.resolve(
          ambiguous
            ? [{ id: '1' }, { id: '2' }]
            : [
                {
                  id: String(
                    thinkerProfilesV1.findIndex((p) => p.name === params[0]) +
                      1,
                  ),
                },
              ],
        );
      if (sql.includes('FROM post'))
        return Promise.resolve(
          collision && params[1] === learningStoriesV6[11].title
            ? [{ id: '999' }]
            : [],
        );
      if (sql.includes('LAST_INSERT_ID'))
        return Promise.resolve([{ id: String(++id) }]);
      return Promise.resolve([]);
    });
    return { isTransactionActive: true, query };
  }

  it('preflights all twelve titles before appending published posts and ordered cards', async () => {
    const r = runner();
    await new PublishPhilosopherStories1791028800000().up(
      r as unknown as QueryRunner,
    );
    expect(
      r.query.mock.calls
        .slice(0, 16)
        .every(([sql]) => sql.startsWith('SELECT')),
    ).toBe(true);
    const writes = r.query.mock.calls.filter(
      ([sql]) => !sql.startsWith('SELECT'),
    );
    expect(writes).toHaveLength(84);
    expect(writes.every(([sql]) => sql.startsWith('INSERT INTO post'))).toBe(
      true,
    );
    const posts = writes.filter(([sql]) =>
      sql.startsWith('INSERT INTO post ('),
    );
    expect(posts).toHaveLength(12);
    expect(posts.every(([, params]) => params[3] === 'published')).toBe(true);
    const cards = writes.filter(([sql]) =>
      sql.startsWith('INSERT INTO post_segment'),
    );
    for (let n = 0; n < 12; n++) {
      expect(
        cards.slice(n * 6, n * 6 + 6).map(([, params]) => params[4]),
      ).toEqual([0, 1, 2, 3, 4, 5]);
      expect(
        cards.slice(n * 6 + 1, n * 6 + 5).map(([, params]) => params[2]),
      ).toEqual(learningStoriesV6[n].cards);
    }
  });

  it.each([
    [true, false],
    [false, true],
  ])(
    'refuses duplicate titles or ambiguous thinkers before writing',
    async (collision, ambiguous) => {
      const r = runner(collision, ambiguous);
      await expect(
        new PublishPhilosopherStories1791028800000().up(
          r as unknown as QueryRunner,
        ),
      ).rejects.toThrow(/already exists|ambiguous/);
      expect(
        r.query.mock.calls.every(([sql]) => sql.startsWith('SELECT')),
      ).toBe(true);
    },
  );

  it('requires a transaction and does not automatically remove published content', async () => {
    const migration = new PublishPhilosopherStories1791028800000();
    expect(migration.transaction).toBe(true);
    await expect(
      migration.up({ isTransactionActive: false } as QueryRunner),
    ).rejects.toThrow('transaction');
    expect(() => migration.down()).toThrow('Forward-only');
  });
  it('contains exactly three distinct new articles for each requested philosopher', () => {
    expect(learningStoriesV6).toHaveLength(12);
    const thinkers = ['socrates', 'plato', 'epicurus', 'marcus-aurelius'];
    expect([...new Set(learningStoriesV6.map((a) => a.philosopher))]).toEqual(
      thinkers,
    );
    for (const key of thinkers)
      expect(
        learningStoriesV6.filter((a) => a.philosopher === key),
      ).toHaveLength(3);
    expect(new Set(learningStoriesV6.map((a) => a.key)).size).toBe(12);
    expect(new Set(learningStoriesV6.map((a) => a.title)).size).toBe(12);
    const oldTitles = new Set(
      [...learningLibraryV5, ...learningPostsV2].map((a) => a.title),
    );
    for (const a of learningStoriesV6) {
      expect(oldTitles.has(a.title)).toBe(false);
      expect(a.title.length).toBeLessThan(120);
      expect(a.cards).toHaveLength(4);
      for (const card of a.cards) {
        expect(card.length).toBeGreaterThan(70);
        expect(card.length).toBeLessThan(350);
        expect(card).toContain('\n');
        expect(card).not.toMatch(/TODO|TBD|확인 필요|임시 본문/);
      }
      expect(a.references.some((r) => r.startsWith('https://'))).toBe(true);
      expect(a.references.some((r) => r.includes('《'))).toBe(true);
    }
  });

  it('illustrates all 72 cards with attributable, verified, nonduplicated images', () => {
    const used = new Set<string>();
    expect(learningStoriesV6.flatMap(storyImages)).toHaveLength(72);
    for (const a of learningStoriesV6) {
      const images = storyImages(a);
      const credits = storyCredits(a);
      expect(credits.length).toBeLessThan(10000);
      for (const field of ['imageKey', 'sha256', 'sourceUrl'] as const)
        expect(new Set(images.map((i) => i[field])).size).toBe(6);
      for (const image of images) {
        used.add(image.imageKey);
        expect(image.imageKey).toMatch(/^[a-z0-9][a-z0-9-]*\.(jpg|png)$/);
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
      for (const reference of a.references)
        expect(credits).toContain(reference);
    }
    // New bundled media must not include discarded/unused candidates.
    for (const image of additions) expect(used.has(image.imageKey)).toBe(true);
  });

  it('retains the distinctions needed to avoid turning narrative into historical fact', () => {
    const text = (key: string) =>
      learningStoriesV6.find((a) => a.key === key)!.cards.join('\n');
    expect(text('socrates-potidaea')).toContain(
      '독립적인 전투 보고서가 아닙니다',
    );
    expect(text('plato-gyges')).toContain('글라우콘');
    expect(text('plato-writing')).toContain('역사적 발명 기록이 아니라');
    expect(text('epicurus-last-letter')).toContain('후대 저자가 보존한 편지');
    expect(text('marcus-morning')).toContain('특정한 날의 침실');
    expect(text('marcus-anger')).toContain('피해자에게 부당한 일을 참으라고');
  });
});
