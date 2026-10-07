import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { QueryRunner } from 'typeorm';
import { ConceptQuestions1791079200000 } from './1791079200000-ConceptQuestions';
import { conceptCategoriesV2, conceptQuestionsV2 } from './content/concepts-v2';
import { conceptThinkers } from './content/concepts-v2/types';
import { dailyV1 } from './content/editorial-v1';
import { onboardingV1 } from './content/onboarding-v1';

describe('published concept questions', () => {
  it('adds seven ordered categories with five onboarding and two daily questions each', () => {
    expect(conceptCategoriesV2.map((c) => c.name)).toEqual([
      '정의',
      '자유',
      '행복',
      '자아',
      '욕망',
      '권력',
      'AI',
    ]);
    expect(conceptQuestionsV2).toHaveLength(49);
    expect(new Set(conceptQuestionsV2.map((q) => q.title)).size).toBe(49);
    expect(new Set(conceptQuestionsV2.map((q) => q.key)).size).toBe(49);
    const oldTitles = new Set(
      [...onboardingV1.flatMap((c) => c.questions), ...dailyV1].map(
        (q) => q.title,
      ),
    );
    for (const c of conceptCategoriesV2) {
      expect(c.questions.filter((q) => q.usage === 'onboarding')).toHaveLength(
        5,
      );
      expect(c.questions.filter((q) => q.usage === 'daily')).toHaveLength(2);
      for (const q of c.questions) expect(oldTitles.has(q.title)).toBe(false);
    }
  });

  it('has complete, concise, neutral choices and traceable thinker applications', () => {
    for (const q of conceptQuestionsV2) {
      expect(q.title.length).toBeLessThanOrEqual(40);
      expect(q.body.length).toBeGreaterThan(45);
      expect(q.body.length).toBeLessThanOrEqual(350);
      expect(q.body).not.toMatch(/\uFFFD|TODO|TBD/);
      expect(q.answers).toHaveLength(2);
      expect(new Set(q.answers.map((a) => a.philosopher)).size).toBe(2);
      for (const a of q.answers) {
        expect(a.body.length).toBeLessThanOrEqual(32);
        expect(a.explanation.length).toBeGreaterThan(50);
        expect(a.explanation.length).toBeLessThanOrEqual(300);
        expect(conceptThinkers[a.philosopher].source).toMatch(/^https:\/\//);
      }
      if (q.usage === 'onboarding') {
        expect(q.type).toBe('single');
        expect(q.followup).toBeUndefined();
      } else {
        expect(q.type).toBe('twoStage');
        expect(q.followup!.body.length).toBeGreaterThan(30);
        expect(q.followup!.answers).toHaveLength(2);
        for (const a of q.followup!.answers) {
          expect(a).not.toHaveProperty('philosopher');
          expect(a.body.length).toBeLessThanOrEqual(32);
          expect(a.explanation.length).toBeGreaterThan(40);
        }
      }
    }
  });

  it('ships a distinct real JPEG for every question, not placeholder or duplicate bytes', () => {
    const hashes = new Set<string>();
    for (const q of conceptQuestionsV2) {
      expect(q.imageKey).toMatch(/^concept-v2-[a-z]+-0[1-7]\.jpg$/);
      const bytes = readFileSync(resolve('content-media', q.imageKey));
      expect(bytes.subarray(0, 3).toString('hex')).toBe('ffd8ff');
      expect(bytes.length).toBeGreaterThan(20_000);
      expect(bytes.length).toBeLessThan(1_500_000);
      hashes.add(createHash('sha256').update(bytes).digest('hex'));
      expect(q.imageBrief.length).toBeGreaterThan(70);
    }
    expect(hashes.size).toBe(49);
  });

  it('requires a transaction and refuses destructive rollback', async () => {
    const migration = new ConceptQuestions1791079200000();
    await expect(
      migration.up({ isTransactionActive: false } as QueryRunner),
    ).rejects.toThrow('transaction');
    expect(() => migration.down()).toThrow('Forward-only');
  });

  it.each(['title', 'thinker', 'duplicate thinker', 'category'])(
    'refuses a %s conflict before any write',
    async (conflict) => {
      const query = jest.fn((sql: string): Promise<unknown> => {
        if (sql.includes('FROM `philosopher`'))
          return Promise.resolve(
            conflict === 'thinker'
              ? []
              : conflict === 'duplicate thinker'
                ? [{ id: '1' }, { id: '2' }]
                : [{ id: '1' }],
          );
        if (sql.includes('FROM question'))
          return Promise.resolve(conflict === 'title' ? [{ id: '12' }] : []);
        if (sql.includes('FROM `category`'))
          return Promise.resolve([{ id: '10' }, { id: '11' }]);
        return Promise.reject(new Error('Unexpected write: ' + sql));
      });
      await expect(
        new ConceptQuestions1791079200000().up({
          isTransactionActive: true,
          query,
        } as unknown as QueryRunner),
      ).rejects.toThrow(/conflict|ambiguous|Ambiguous/);
      expect(
        query.mock.calls.some(([sql]) => /^(INSERT|UPDATE|DELETE)/.test(sql)),
      ).toBe(false);
    },
  );

  it.each([false, true])(
    'inserts only new rows with string bigint IDs (legacy relation: %s)',
    async (legacy) => {
      let id = 9007199254740993n;
      const query = jest.fn((sql: string): Promise<unknown> => {
        if (sql.startsWith('SELECT CAST(id AS CHAR)')) {
          if (sql.includes('philosopher'))
            return Promise.resolve([{ id: '9007199254740999' }]);
          return Promise.resolve([]);
        }
        if (sql.startsWith('SELECT id FROM question'))
          return Promise.resolve([]);
        if (sql.includes('MAX(sortOrder)'))
          return Promise.resolve([{ value: 30 }]);
        if (sql.includes('LAST_INSERT_ID()'))
          return Promise.resolve([{ id: String(id) }]);
        if (sql.startsWith('INSERT')) {
          id++;
          return Promise.resolve({});
        }
        return Promise.reject(new Error('Unexpected SQL: ' + sql));
      });
      const runner = {
        isTransactionActive: true,
        query,
        hasColumn: jest.fn().mockResolvedValue(legacy),
      } as unknown as QueryRunner;
      await new ConceptQuestions1791079200000().up(runner);
      const calls = query.mock.calls as unknown as Array<[string, unknown[]]>;
      expect(calls).toContainEqual([
        'SELECT CAST(id AS CHAR) AS id FROM `philosopher` WHERE name IN (?, ?) LIMIT 2 FOR UPDATE',
        ['이마누엘 칸트', '임마누엘 칸트'],
      ]);
      expect(
        calls.filter(([s]) => s.startsWith('INSERT INTO category')),
      ).toHaveLength(7);
      expect(
        calls.filter(([s]) => s.startsWith('INSERT INTO question (')),
      ).toHaveLength(49);
      expect(
        calls.filter(([s]) => s.startsWith('INSERT INTO answer ')),
      ).toHaveLength(98);
      expect(
        calls.filter(([s]) => s.startsWith('INSERT INTO followup_answer')),
      ).toHaveLength(28);
      expect(
        calls.some(([s]) => /^(UPDATE|DELETE|ALTER|DROP|TRUNCATE)/.test(s)),
      ).toBe(false);
      for (const [sql, args] of calls.filter(([s]) =>
        s.startsWith('INSERT INTO followup_answer'),
      )) {
        expect(typeof args[0]).toBe('string');
        expect(sql.includes('question_id')).toBe(legacy);
        if (legacy) expect(args[0]).toBe(args[1]);
      }
    },
  );
});
