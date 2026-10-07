import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { QueryRunner } from 'typeorm';
import { learningLibraryV5 } from './content/learning-library-v5';
import {
  libraryCredits,
  libraryImages,
} from './content/learning-library-images-v5';
import { thinkerProfilesV1 } from './content/thinker-profiles-v1';
import { learningPostsV2 } from './content/learning-posts-v2';
import { ExpandLearningLibrary1791025200000 } from './1791025200000-ExpandLearningLibrary';
import { imageExtension } from '../../media/media.service';

describe('append-only illustrated learning library', () => {
  it('adds 59 distinct new topics for all 28 thinkers, including five ordered Odyssey parts', () => {
    expect(learningLibraryV5).toHaveLength(59);
    expect(new Set(learningLibraryV5.map((a) => a.key)).size).toBe(59);
    expect(new Set(learningLibraryV5.map((a) => a.title)).size).toBe(59);
    for (const p of thinkerProfilesV1)
      expect(
        learningLibraryV5.filter((a) => a.philosopher === p.key),
      ).toHaveLength(p.key === 'odysseus' ? 5 : 2);
    expect(
      learningLibraryV5
        .filter((a) => a.philosopher === 'odysseus')
        .map((a) => a.key),
    ).toEqual([
      'odyssey-1',
      'odyssey-2',
      'odyssey-3',
      'odyssey-4',
      'odyssey-5',
    ]);
    for (const a of learningLibraryV5) {
      expect(learningPostsV2.some((old) => old.title === a.title)).toBe(false);
      expect(a.title.length).toBeLessThan(120);
      expect(a.cards).toHaveLength(4);
      for (const card of a.cards) {
        expect(card.length).toBeGreaterThan(70);
        expect(card.length).toBeLessThan(350);
        expect(card).not.toMatch(/TODO|TBD|확인 필요|임시 본문/);
      }
      expect(a.references.some((r) => r.startsWith('https://'))).toBe(true);
    }
  });

  it('has 354 illustrated cards with traceable, byte-verified distinct images in each article', () => {
    expect(learningLibraryV5.flatMap(libraryImages)).toHaveLength(354);
    for (const a of learningLibraryV5) {
      const images = libraryImages(a);
      const credits = libraryCredits(a);
      expect(credits.length).toBeLessThan(10000);
      for (const field of ['imageKey', 'sha256', 'sourceUrl'] as const)
        expect(new Set(images.map((i) => i[field])).size).toBe(6);
      for (const i of images) {
        const bytes = readFileSync(resolve('content-media', i.imageKey));
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(i.sha256);
        expect(i.imageKey.endsWith('.' + imageExtension(bytes))).toBe(true);
        expect(bytes.length).toBeLessThan(2 * 1024 * 1024);
        for (const field of [
          'creator',
          'caption',
          'sourceUrl',
          'license',
          'licenseUrl',
          'changes',
        ] as const) {
          expect(i[field].length).toBeGreaterThan(0);
          expect(credits).toContain(i[field]);
        }
      }
      for (const r of a.references) expect(credits).toContain(r);
    }
  });

  function runner(collision = false, ambiguous = false) {
    let nextId = 1000;
    const query = jest.fn((sql: string, params: unknown[] = []) => {
      if (sql.includes('FROM philosopher'))
        return Promise.resolve(
          ambiguous
            ? []
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
          collision && params[1] === learningLibraryV5[58].title
            ? [{ id: '999' }]
            : [],
        );
      if (sql.includes('LAST_INSERT_ID'))
        return Promise.resolve([{ id: String(++nextId) }]);
      return Promise.resolve([]);
    });
    return { isTransactionActive: true, query };
  }

  it('preflights all records and only appends published posts and ordered cards', async () => {
    const r = runner();
    await new ExpandLearningLibrary1791025200000().up(
      r as unknown as QueryRunner,
    );
    expect(
      r.query.mock.calls
        .slice(0, 87)
        .every(([sql]) => sql.startsWith('SELECT')),
    ).toBe(true);
    const writes = r.query.mock.calls.filter(
      ([sql]) => !sql.startsWith('SELECT'),
    );
    expect(writes).toHaveLength(59 + 354);
    expect(writes.every(([sql]) => sql.startsWith('INSERT INTO post'))).toBe(
      true,
    );
    const posts = writes.filter(([sql]) =>
      sql.startsWith('INSERT INTO post ('),
    );
    expect(posts.every(([, params]) => params[3] === 'published')).toBe(true);
    const cards = writes.filter(([sql]) =>
      sql.startsWith('INSERT INTO post_segment'),
    );
    for (let n = 0; n < 59; n++)
      expect(
        cards.slice(n * 6, n * 6 + 6).map(([, params]) => params[4]),
      ).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it.each([
    [true, false],
    [false, true],
  ])(
    'refuses collisions or missing thinkers before any write',
    async (collision, ambiguous) => {
      const r = runner(collision, ambiguous);
      await expect(
        new ExpandLearningLibrary1791025200000().up(
          r as unknown as QueryRunner,
        ),
      ).rejects.toThrow(/already exists|ambiguous/);
      expect(
        r.query.mock.calls.every(([sql]) => sql.startsWith('SELECT')),
      ).toBe(true);
    },
  );

  it('requires a transaction and never automatically deletes its published content', async () => {
    const migration = new ExpandLearningLibrary1791025200000();
    expect(migration.transaction).toBe(true);
    await expect(
      migration.up({ isTransactionActive: false } as QueryRunner),
    ).rejects.toThrow('transaction');
    expect(() => migration.down()).toThrow('Forward-only');
  });
});
