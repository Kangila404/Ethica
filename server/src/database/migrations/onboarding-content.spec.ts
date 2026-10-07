import { onboardingV1, philosophersV1 } from './content/onboarding-v1';
import { OnboardingContent1790740800000 } from './1790740800000-OnboardingContent';
import type { QueryRunner } from 'typeorm';

describe('released onboarding content', () => {
  it('provides five complete, distinct questions and equal thinker exposure per category', () => {
    const titles = new Set<string>();
    expect(onboardingV1).toHaveLength(3);
    for (const category of onboardingV1) {
      expect(category.name.length).toBeLessThanOrEqual(50);
      expect(category.questions).toHaveLength(5);
      expect(category.questions.filter((q) => q.followup)).toHaveLength(1);
      const exposure: Record<string, number> = {};
      for (const q of category.questions) {
        expect(titles.has(q.title)).toBe(false);
        titles.add(q.title);
        expect(q.title.length).toBeLessThanOrEqual(100);
        expect(q.body.trim().length).toBeGreaterThan(20);
        expect(q.answers).toHaveLength(2);
        expect(new Set(q.answers.map((a) => a.philosopher)).size).toBe(2);
        for (const a of q.answers) {
          expect(philosophersV1[a.philosopher]).toBeDefined();
          expect(a.body.length).toBeLessThanOrEqual(255);
          expect(a.explanation.trim().length).toBeGreaterThan(20);
          exposure[a.philosopher] = (exposure[a.philosopher] ?? 0) + 1;
        }
        if (q.followup) {
          expect(q.followup.body.trim().length).toBeGreaterThan(20);
          expect(q.followup.answers).toHaveLength(2);
          for (const a of q.followup.answers) {
            expect(a.body.length).toBeLessThanOrEqual(255);
            expect(a.explanation.trim().length).toBeGreaterThan(20);
            expect(a).not.toHaveProperty('philosopher');
          }
        }
      }
      expect(exposure).toEqual({
        kant: 2,
        mill: 2,
        aristotle: 2,
        epictetus: 2,
        rawls: 2,
      });
    }
    expect(titles.size).toBe(15);
  });

  it('requires a transaction and refuses destructive rollback', async () => {
    const migration = new OnboardingContent1790740800000();
    expect(migration.transaction).toBe(true);
    await expect(
      migration.up({ isTransactionActive: false } as QueryRunner),
    ).rejects.toThrow('requires a migration transaction');
    expect(() => migration.down()).toThrow('Forward-only');
  });
});
