import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { QueryRunner } from 'typeorm';
import { EditorialMedia1790920800000 } from './1790920800000-EditorialMedia';
import { dailyV1, postsV1, contentImage } from './content/editorial-v1';
import { philosophersV1 } from './content/onboarding-v1';

describe('review batch integrity', () => {
  it('has fifteen unique questions with real covers and valid first/followup choices', () => {
    expect(dailyV1).toHaveLength(15);
    expect(new Set(dailyV1.map((q) => q.title)).size).toBe(15);
    const counts = new Map<string, number>();
    for (const question of dailyV1) {
      counts.set(question.category, (counts.get(question.category) ?? 0) + 1);
      expect(question.answers).toHaveLength(2);
      expect(
        existsSync(resolve('content-media', contentImage(question.image))),
      ).toBe(true);
      for (const answer of question.answers) {
        expect(philosophersV1[answer.philosopher]).toBeDefined();
        expect(answer.body.length).toBeLessThanOrEqual(32);
        expect(answer.explanation.length).toBeGreaterThan(30);
      }
      if (question.followup) {
        expect(question.followup.answers).toHaveLength(2);
        for (const answer of question.followup.answers)
          expect(answer).not.toHaveProperty('philosopher');
      }
    }
    expect([...counts.values()]).toEqual([5, 5, 5]);
    expect(dailyV1.filter((q) => q.followup)).toHaveLength(3);
  });
  it('has a six-card original post and cover for each thinker', () => {
    expect(postsV1).toHaveLength(5);
    expect(new Set(postsV1.map((p) => p.philosopher)).size).toBe(5);
    for (const post of postsV1) {
      expect(post.cards).toHaveLength(6);
      expect(
        post.cards.every((body) => body.length > 10 && body.length < 350),
      ).toBe(true);
      expect(
        existsSync(resolve('content-media', contentImage(post.image))),
      ).toBe(true);
    }
  });
  it('refuses insertion outside a transaction and destructive reversal', async () => {
    const migration = new EditorialMedia1790920800000();
    await expect(
      migration.up({ isTransactionActive: false } as QueryRunner),
    ).rejects.toThrow('transaction');
    expect(() => migration.down()).toThrow('Forward-only');
  });
});
