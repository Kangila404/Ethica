import { MigrationInterface, QueryRunner } from 'typeorm';
import { contentImage, dailyV1, postsV1 } from './content/editorial-v1';
import { philosophersV1 } from './content/onboarding-v1';

// Explicit user approval on 2026-10-02: publish the reviewed 15 questions and 5 posts only.
export class PublishReviewedContent1790989200000 implements MigrationInterface {
  transaction = true;
  async up(runner: QueryRunner): Promise<void> {
    if (!runner.isTransactionActive)
      throw new Error('Publication requires a transaction');
    for (const question of dailyV1) {
      await runner.query(
        'UPDATE question SET status = ?, isActive = 1 WHERE `usage` = ? AND title = ? AND imageKey = ? AND status = ?',
        [
          'published',
          'daily',
          question.title,
          contentImage(question.image),
          'draft',
        ],
      );
    }
    for (const post of postsV1) {
      await runner.query(
        'UPDATE post p JOIN philosopher f ON f.id = p.philosopher_id SET p.status = ? WHERE p.title = ? AND f.name = ? AND p.image_key = ? AND p.status = ?',
        [
          'published',
          post.title,
          philosophersV1[post.philosopher].name,
          contentImage(post.image),
          'draft',
        ],
      );
    }
  }
  down(): Promise<void> {
    throw new Error(
      'Forward-only: use administrator review status to unpublish',
    );
  }
}
