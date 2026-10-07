import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { QueryRunner } from 'typeorm';
import { analectsArticlesV8, analectsBooksV8 } from './content/analects-v8';
import { analectsCredits, analectsImages } from './content/analects-images-v8';
import additions from './content/learning-images-v8.json';
import { learningLibraryV5 } from './content/learning-library-v5';
import { PublishAnalects1791158400000 } from './1791158400000-PublishAnalects';
import { imageExtension } from '../../media/media.service';

describe('Analects: first ten books', () => {
  function runner(collision = false, ambiguous = false) {
    let id = 1000;
    const query = jest.fn((sql: string, params: unknown[] = []) => {
      if (sql.includes('FROM philosopher'))
        return Promise.resolve(
          ambiguous ? [{ id: '19' }, { id: '20' }] : [{ id: '19' }],
        );
      if (sql.includes('FROM post'))
        return Promise.resolve(
          collision && params[1] === analectsArticlesV8[9].title
            ? [{ id: '999' }]
            : [],
        );
      if (sql.includes('LAST_INSERT_ID'))
        return Promise.resolve([{ id: String(++id) }]);
      return Promise.resolve([]);
    });
    return { isTransactionActive: true, query };
  }
  it('preflights every title before append-only publication of ten posts and 160 ordered slides', async () => {
    const r = runner();
    await new PublishAnalects1791158400000().up(r as unknown as QueryRunner);
    expect(
      r.query.mock.calls
        .slice(0, 11)
        .every(([sql]) => sql.startsWith('SELECT')),
    ).toBe(true);
    const writes = r.query.mock.calls.filter(
      ([sql]) => !sql.startsWith('SELECT'),
    );
    expect(writes).toHaveLength(170);
    expect(writes.every(([sql]) => sql.startsWith('INSERT INTO post'))).toBe(
      true,
    );
    const posts = writes.filter(([sql]) =>
      sql.startsWith('INSERT INTO post ('),
    );
    expect(posts).toHaveLength(10);
    expect(posts.every(([, p]) => p[0] === '19' && p[3] === 'published')).toBe(
      true,
    );
    const cards = writes.filter(([sql]) =>
      sql.startsWith('INSERT INTO post_segment'),
    );
    analectsArticlesV8.forEach((a, i) => {
      const group = cards.slice(i * 16, (i + 1) * 16);
      expect(group.map(([, p]) => p[4])).toEqual(
        Array.from({ length: 16 }, (_, n) => n),
      );
      expect(group.map(([, p]) => p[2])).toEqual([
        null,
        ...a.cards,
        analectsCredits(a),
      ]);
      expect(group.map(([, p]) => p[3])).toEqual(
        analectsImages(a).map((img) => img.imageKey),
      );
    });
  });
  it.each([
    [true, false],
    [false, true],
  ])(
    'fails closed on title collision or ambiguous identity',
    async (collision, ambiguous) => {
      const r = runner(collision, ambiguous);
      await expect(
        new PublishAnalects1791158400000().up(r as unknown as QueryRunner),
      ).rejects.toThrow(/already exists|ambiguous/);
      expect(
        r.query.mock.calls.every(([sql]) => sql.startsWith('SELECT')),
      ).toBe(true);
    },
  );
  it('requires a transaction and cannot automatically delete published content', async () => {
    const m = new PublishAnalects1791158400000();
    expect(m.transaction).toBe(true);
    await expect(
      m.up({ isTransactionActive: false } as QueryRunner),
    ).rejects.toThrow('transaction');
    expect(() => m.down()).toThrow('Forward-only');
  });
  it('performs no database writes when media preflight fails', async () => {
    const previous = process.env.MEDIA_CONTENT_DIRECTORY;
    const r = runner();
    try {
      process.env.MEDIA_CONTENT_DIRECTORY = resolve(
        'content-media',
        'nonexistent-analects-test',
      );
      await expect(
        new PublishAnalects1791158400000().up(r as unknown as QueryRunner),
      ).rejects.toThrow();
      expect(r.query).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.MEDIA_CONTENT_DIRECTORY;
      else process.env.MEDIA_CONTENT_DIRECTORY = previous;
    }
  });
  it('has ten distinct original articles with fourteen substantive body cards each', () => {
    expect(analectsArticlesV8).toHaveLength(10);
    expect(new Set(analectsArticlesV8.map((a) => a.key)).size).toBe(10);
    for (const a of analectsArticlesV8) {
      expect(a.philosopher).toBe('confucius');
      expect(a.cards).toHaveLength(14);
      expect(learningLibraryV5.some((old) => old.title === a.title)).toBe(
        false,
      );
      expect(a.title.length).toBeLessThan(120);
      for (const body of a.cards) {
        expect(body.length).toBeGreaterThan(45);
        expect(body.length).toBeLessThan(600);
        expect(body).toContain('\n');
        expect(body).not.toMatch(/TODO|TBD|확인 필요|임시 본문|\uFFFD/);
      }
      expect(a.references.some((r) => r.startsWith('https://'))).toBe(true);
    }
  });
  it('has attributable, unique original images on all 160 cards, including credits', () => {
    const used = new Set<string>();
    expect(analectsArticlesV8.flatMap(analectsImages)).toHaveLength(160);
    for (const a of analectsArticlesV8) {
      const imgs = analectsImages(a),
        credits = analectsCredits(a);
      expect(credits.startsWith('더 읽기 · 자료 출처')).toBe(true);
      expect(credits.length).toBeLessThan(10000);
      for (const field of ['imageKey', 'sha256', 'sourceUrl'] as const)
        expect(new Set(imgs.map((i) => i[field])).size).toBe(16);
      for (const img of imgs) {
        used.add(img.imageKey);
        const bytes = readFileSync(resolve('content-media', img.imageKey));
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(
          img.sha256,
        );
        expect(img.imageKey.endsWith('.' + imageExtension(bytes))).toBe(true);
        expect(bytes.length).toBeLessThan(2 * 1024 * 1024);
        for (const field of [
          'creator',
          'caption',
          'sourceUrl',
          'license',
          'licenseUrl',
          'changes',
        ] as const) {
          expect(img[field].length).toBeGreaterThan(0);
          expect(credits).toContain(img[field]);
        }
      }
      for (const ref of a.references) expect(credits).toContain(ref);
    }
    for (const img of additions) expect(used.has(img.imageKey)).toBe(true);
  });
  it('identifies speakers, variant readings and reproducible primary references', () => {
    expect(analectsBooksV8).toHaveLength(10);
    expect(analectsBooksV8.flatMap((b) => b.passages)).toHaveLength(30);
    for (const b of analectsBooksV8) {
      expect(b.sourceRevision).toBeGreaterThan(0);
      for (const p of b.passages) {
        expect(p.quote).toMatch(/[一-鿿]/);
        expect(p.reading).toMatch(/[가-힣]/);
        expect(p.gloss).toContain('(');
        expect(p.speaker).not.toBe('');
      }
    }
    expect(analectsBooksV8[0].passages.map((p) => p.speaker)).toEqual([
      '공자',
      '증자',
      '유자',
    ]);
    expect(analectsBooksV8[3].passages[1].speaker).toBe('증자');
    expect(analectsBooksV8[7].passages[1].speaker).toBe('증자');
    expect(analectsBooksV8[8].passages[0].speaker).toBe('기록자의 서술');
    expect(analectsBooksV8[2].passages[2].meaning).toContain('해석도 있어');
    for (const a of analectsArticlesV8)
      expect(a.references.some((r) => r.includes('&oldid='))).toBe(true);
  });
});
