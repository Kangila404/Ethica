import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { QueryRunner } from 'typeorm';
import {
  questionsV3,
  thinkers,
  additionalThinkers,
  validateQuestionsV3,
} from './content/dilemmas-v3';
import { RevisePhilosophicalDilemmas1792540800000 } from './1792540800000-RevisePhilosophicalDilemmas';

describe('philosophical dilemmas v3', () => {
  it('accepts only the three verified editorial renames as exact aliases', () => {
    expect(
      questionsV3
        .filter((q) => q.replaces.titles.length > 1)
        .map((q) => q.replaces.titles[1])
        .sort(),
    ).toEqual(
      [
        '모임에서 저도 말 좀하고 싶어요!',
        '이웃에 도움을 주는 방법',
        '자선행사를 알려 봐요!',
      ].sort(),
    );
    for (const q of questionsV3)
      expect(q.replaces.titles[0]).toBe(q.replaces.title);
  });
  it('replaces exactly 79 slots with 50 introductory and 29 daily questions', () => {
    expect(validateQuestionsV3).not.toThrow();
    expect(questionsV3.filter((q) => q.usage === 'onboarding')).toHaveLength(
      50,
    );
    expect(questionsV3.filter((q) => q.usage === 'daily')).toHaveLength(29);
    for (const category of new Set(questionsV3.map((q) => q.category)))
      expect(
        questionsV3.filter(
          (q) => q.category === category && q.usage === 'onboarding',
        ),
      ).toHaveLength(5);
    for (const q of questionsV3) expect(q.title).not.toBe(q.replaces.title);
  });

  it('uses diverse real profiles, including all twelve additions', () => {
    const counts = new Map<string, number>();
    for (const q of questionsV3)
      for (const a of q.answers) {
        expect(thinkers.some((p) => p.key === a.philosopher)).toBe(true);
        counts.set(a.philosopher, (counts.get(a.philosopher) ?? 0) + 1);
      }
    expect(counts.size).toBeGreaterThanOrEqual(30);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(16);
    for (const [key] of additionalThinkers) expect(counts.has(key)).toBe(true);
    for (const p of thinkers.filter((p) => p.added)) {
      expect(p.name.length).toBeLessThanOrEqual(50);
      expect(p.era.length).toBeLessThanOrEqual(50);
      expect(p.school.length).toBeLessThanOrEqual(50);
      expect(p.coreThought.length).toBeGreaterThan(40);
      expect(p.lifeRoots.length).toBeGreaterThan(40);
      expect(p.source).toMatch(/^https:\/\//);
    }
  });

  it('keeps readable paragraphs, short choices, follow-up structure and source provenance', () => {
    for (const q of questionsV3) {
      expect(q.title.length).toBeLessThanOrEqual(100);
      expect(q.body).toBe(q.lines.join('\n\n'));
      expect(q.body.length).toBeLessThanOrEqual(400);
      expect(q.body).not.toMatch(/\uFFFD|TODO|TBD|\. [가-힣]/);
      expect(q.reference.length).toBeGreaterThan(12);
      expect(new URL(q.source).protocol).toBe('https:');
      const choices = [...q.answers, ...(q.followup?.answers ?? [])];
      for (const a of choices) {
        expect(a.body.length).toBeGreaterThan(5);
        expect(a.body.length).toBeLessThanOrEqual(40);
        expect(a.explanation.length).toBeGreaterThan(35);
        expect(
          a.explanation.split('[자료 출처]')[0].trim().length,
        ).toBeLessThanOrEqual(300);
      }
      for (const a of q.answers) {
        expect(a.explanation).toContain('[자료 출처]');
        expect(a.explanation).toContain('[이미지 출처]');
        expect(a.explanation).toContain(q.source);
      }
      if (q.followup) {
        expect(q.followup.body).toContain('\n\n');
        for (const a of q.followup.answers)
          expect(a).not.toHaveProperty('philosopher');
      }
      expect(q.imageKey).not.toMatch(/[/\\]/);
      const bytes = readFileSync(resolve('content-media', q.imageKey));
      expect(bytes.length).toBeGreaterThan(1000);
      expect(['ffd8ff', '89504e']).toContain(
        bytes.subarray(0, 3).toString('hex'),
      );
    }
  });

  function runnerFixture(
    options: {
      conflict?: string;
      legacy?: boolean;
      existingNewProfile?: boolean;
    } = {},
  ) {
    let insertedId = 9007199254740993n;
    let oldIndex = 0;
    const statuses = ['published', 'draft', 'held'] as const;
    const query = jest.fn(
      async (sql: string, args: unknown[] = []): Promise<unknown> => {
        // Model the asynchronous query boundary of a real QueryRunner.
        await Promise.resolve();
        if (sql.includes('FROM philosopher WHERE')) {
          if (options.conflict === 'thinker') return [];
          if (options.conflict === 'duplicate thinker')
            return [{ id: '2' }, { id: '3' }];
          const p = thinkers.find((p) => p.name === args[0])!;
          return p.added && !options.existingNewProfile
            ? []
            : [{ id: String(100 + thinkers.indexOf(p)) }];
        }
        if (sql.includes('FROM category WHERE'))
          return options.conflict === 'category' ? [] : [{ id: '40' }];
        if (sql.startsWith('SELECT id FROM question'))
          return options.conflict === 'title' ? [{ id: '99' }] : [];
        if (sql.includes('FROM question q')) {
          if (options.conflict === 'missing old') return [];
          if (options.conflict === 'ambiguous old')
            return [{ id: '1' }, { id: '2' }];
          return [
            { id: String(1000 + oldIndex), status: statuses[oldIndex++ % 3] },
          ];
        }
        if (sql.includes('LAST_INSERT_ID()'))
          return [{ id: String(insertedId) }];
        if (sql.startsWith('INSERT')) {
          insertedId++;
          return {};
        }
        if (sql.startsWith('UPDATE question SET status'))
          return { affectedRows: 1 };
        throw new Error('Unexpected SQL: ' + sql);
      },
    );
    return {
      query,
      runner: {
        isTransactionActive: true,
        query,
        hasColumn: jest.fn().mockResolvedValue(options.legacy ?? false),
      } as unknown as QueryRunner,
    };
  }

  it.each([
    'thinker',
    'duplicate thinker',
    'category',
    'title',
    'missing old',
    'ambiguous old',
  ])('rejects %s during read-only preflight', async (conflict) => {
    const { query, runner } = runnerFixture({ conflict });
    await expect(
      new RevisePhilosophicalDilemmas1792540800000().up(runner),
    ).rejects.toThrow();
    expect(
      query.mock.calls.some(([sql]) =>
        /^(INSERT|UPDATE|DELETE|ALTER)/.test(sql),
      ),
    ).toBe(false);
  });

  it.each([false, true])(
    'preserves history and review status (legacy relation: %s)',
    async (legacy) => {
      const { query, runner } = runnerFixture({ legacy });
      await new RevisePhilosophicalDilemmas1792540800000().up(runner);
      const calls = query.mock.calls;
      const inserts = calls.filter(([sql]) =>
        sql.startsWith('INSERT INTO question ('),
      );
      expect(inserts).toHaveLength(79);
      expect(
        calls.filter(([sql]) => sql.startsWith('INSERT INTO answer ')),
      ).toHaveLength(158);
      expect(
        calls.filter(([sql]) => sql.startsWith('INSERT INTO followup_answer')),
      ).toHaveLength(58);
      expect(
        calls.filter(([sql]) => sql.startsWith('INSERT INTO philosopher ')),
      ).toHaveLength(12);
      expect(
        calls.filter(([sql]) =>
          sql.startsWith('INSERT INTO learning_profile_category'),
        ),
      ).toHaveLength(12);
      const updates = calls.filter(([sql]) => sql.startsWith('UPDATE'));
      expect(updates).toHaveLength(79);
      for (const [sql, args] of updates) {
        expect(sql).toBe(
          "UPDATE question SET status = 'held', isActive = 0 WHERE id = ? AND status = 'published'",
        );
        expect(args).toHaveLength(1);
      }
      inserts.forEach(([, args], i) => {
        expect(args![7]).toBe(['published', 'draft', 'held'][i % 3]);
        expect(args![6]).toBe(i % 3 === 0 ? 1 : 0);
      });
      for (const [sql, args] of calls.filter(([sql]) =>
        sql.startsWith('INSERT INTO followup_answer'),
      )) {
        expect(sql.includes('question_id')).toBe(legacy);
        expect(typeof args![0]).toBe('string');
        expect(BigInt(args![0] as string)).toBeGreaterThan(
          BigInt(Number.MAX_SAFE_INTEGER),
        );
        if (legacy) expect(args![0]).toBe(args![1]);
      }
      expect(
        calls.some(([sql]) => /^(DELETE|DROP|ALTER|TRUNCATE)/.test(sql)),
      ).toBe(false);
      expect(
        calls.some(([sql]) =>
          /UPDATE (answer|followup_answer|users|user_)/.test(sql),
        ),
      ).toBe(false);
    },
  );

  it('reuses existing added profiles without changing their biography or image', async () => {
    const { query, runner } = runnerFixture({ existingNewProfile: true });
    await new RevisePhilosophicalDilemmas1792540800000().up(runner);
    expect(
      query.mock.calls.some(([sql]) =>
        /^(INSERT INTO|UPDATE) philosopher/.test(sql),
      ),
    ).toBe(false);
  });

  it('cannot run without a transaction or destructively roll back', async () => {
    const migration = new RevisePhilosophicalDilemmas1792540800000();
    expect(migration.transaction).toBe(true);
    await expect(
      migration.up({ isTransactionActive: false } as QueryRunner),
    ).rejects.toThrow('transaction');
    expect(() => migration.down()).toThrow('Forward-only');
  });
});
