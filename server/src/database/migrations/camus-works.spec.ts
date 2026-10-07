import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { QueryRunner } from 'typeorm';
import { camusWorksV7 } from './content/camus-works-v7';
import { camusCredits, camusImages } from './content/camus-images-v7';
import additions from './content/learning-images-v7.json';
import { learningLibraryV5 } from './content/learning-library-v5';
import { PublishCamusWorks1791097200000 } from './1791097200000-PublishCamusWorks';
import { imageExtension } from '../../media/media.service';

describe('Camus: five major works', () => {
  function runner(collision = false, ambiguous = false) {
    let id = 1000;
    const query = jest.fn((sql: string, params: unknown[] = []) => {
      if (sql.includes('FROM philosopher'))
        return Promise.resolve(
          ambiguous ? [{ id: '19' }, { id: '20' }] : [{ id: '19' }],
        );
      if (sql.includes('FROM post'))
        return Promise.resolve(
          collision && params[1] === camusWorksV7[4].title
            ? [{ id: '999' }]
            : [],
        );
      if (sql.includes('LAST_INSERT_ID'))
        return Promise.resolve([{ id: String(++id) }]);
      return Promise.resolve([]);
    });
    return { isTransactionActive: true, query };
  }
  it('preflights every title before append-only publication of five posts and 70 ordered slides', async () => {
    const r = runner();
    await new PublishCamusWorks1791097200000().up(r as unknown as QueryRunner);
    expect(
      r.query.mock.calls.slice(0, 6).every(([sql]) => sql.startsWith('SELECT')),
    ).toBe(true);
    const writes = r.query.mock.calls.filter(
      ([sql]) => !sql.startsWith('SELECT'),
    );
    expect(writes).toHaveLength(75);
    expect(writes.every(([sql]) => sql.startsWith('INSERT INTO post'))).toBe(
      true,
    );
    const posts = writes.filter(([sql]) =>
      sql.startsWith('INSERT INTO post ('),
    );
    expect(posts).toHaveLength(5);
    expect(posts.every(([, p]) => p[0] === '19' && p[3] === 'published')).toBe(
      true,
    );
    const cards = writes.filter(([sql]) =>
      sql.startsWith('INSERT INTO post_segment'),
    );
    camusWorksV7.forEach((a, i) => {
      const group = cards.slice(i * 14, (i + 1) * 14);
      expect(group.map(([, p]) => p[4])).toEqual(
        Array.from({ length: 14 }, (_, n) => n),
      );
      expect(group.map(([, p]) => p[2])).toEqual([
        null,
        ...a.cards,
        camusCredits(a),
      ]);
      expect(group.map(([, p]) => p[3])).toEqual(
        camusImages(a).map((img) => img.imageKey),
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
        new PublishCamusWorks1791097200000().up(r as unknown as QueryRunner),
      ).rejects.toThrow(/already exists|ambiguous/);
      expect(
        r.query.mock.calls.every(([sql]) => sql.startsWith('SELECT')),
      ).toBe(true);
    },
  );
  it('requires a transaction and cannot automatically delete published content', async () => {
    const m = new PublishCamusWorks1791097200000();
    expect(m.transaction).toBe(true);
    await expect(
      m.up({ isTransactionActive: false } as QueryRunner),
    ).rejects.toThrow('transaction');
    expect(() => m.down()).toThrow('Forward-only');
  });
  it('has five distinct original articles with twelve substantive body cards each', () => {
    expect(camusWorksV7).toHaveLength(5);
    expect(new Set(camusWorksV7.map((a) => a.key)).size).toBe(5);
    for (const a of camusWorksV7) {
      expect(a.philosopher).toBe('camus');
      expect(a.cards).toHaveLength(12);
      expect(learningLibraryV5.some((old) => old.title === a.title)).toBe(
        false,
      );
      expect(a.title.length).toBeLessThan(120);
      for (const body of a.cards) {
        expect(body.length).toBeGreaterThan(65);
        expect(body.length).toBeLessThan(350);
        expect(body).toContain('\n');
        expect(body).not.toMatch(/TODO|TBD|확인 필요|임시 본문|\uFFFD/);
      }
      expect(a.references.some((r) => r.startsWith('https://'))).toBe(true);
    }
  });
  it('has attributable, unique original images on all 70 cards, including credits', () => {
    const used = new Set<string>();
    expect(camusWorksV7.flatMap(camusImages)).toHaveLength(70);
    for (const a of camusWorksV7) {
      const imgs = camusImages(a),
        credits = camusCredits(a);
      expect(credits.startsWith('더 읽기 · 자료 출처')).toBe(true);
      expect(credits.length).toBeLessThan(10000);
      for (const field of ['imageKey', 'sha256', 'sourceUrl'] as const)
        expect(new Set(imgs.map((i) => i[field])).size).toBe(14);
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
  it('marks spoilers, separates narrator from author and does not excuse violence', () => {
    const text = (key: string) =>
      camusWorksV7.find((a) => a.key === key)!.cards.join('\n');
    for (const key of ['stranger', 'plague', 'fall'])
      expect(text('camus-' + key)).toContain('결말 포함');
    expect(text('camus-stranger')).toContain('면책 사유가 아닙니다');
    expect(text('camus-stranger')).toContain('피해자');
    expect(text('camus-fall')).toContain('카뮈 자신의 고백');
    expect(text('camus-sisyphus')).toContain('죽음의 권유가 아니라');
    expect(text('camus-rebel')).toContain('폭력 전체에 대한 승인이 아닙니다');
  });
});
