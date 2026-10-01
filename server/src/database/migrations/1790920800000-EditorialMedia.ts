import { MigrationInterface, QueryRunner } from 'typeorm';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  contentImage,
  dailyV1,
  imageThemes,
  onboardingImageThemes,
  postsV1,
} from './content/editorial-v1';
import {
  onboardingV1,
  philosophersV1,
  ThinkerKey,
} from './content/onboarding-v1';

// Run after ContentReview. No schema DDL: data and migration ledger commit together.
export class EditorialMedia1790920800000 implements MigrationInterface {
  transaction = true;
  async up(runner: QueryRunner): Promise<void> {
    if (!runner.isTransactionActive)
      throw new Error('Editorial content requires a transaction');
    const directory = resolve(
      process.env.MEDIA_CONTENT_DIRECTORY || 'content-media',
    );
    for (const theme of imageThemes)
      await access(resolve(directory, contentImage(theme)));
    const thinkers = new Map<ThinkerKey, string>();
    for (const key of Object.keys(philosophersV1) as ThinkerKey[]) {
      thinkers.set(
        key,
        await this.named(runner, 'philosopher', philosophersV1[key].name),
      );
    }
    const categories = new Map<string, string>();
    for (const name of new Set(dailyV1.map((q) => q.category))) {
      categories.set(name, await this.named(runner, 'category', name));
    }
    // Refuse conflicts instead of adopting or overwriting administrator-owned content.
    for (const question of dailyV1) {
      const rows: unknown[] = await runner.query(
        'SELECT id FROM question WHERE `usage` = ? AND title = ? LIMIT 1',
        ['daily', question.title],
      );
      if (rows.length)
        throw new Error(`Daily draft title already exists: ${question.title}`);
    }
    for (const post of postsV1) {
      const rows: unknown[] = await runner.query(
        'SELECT id FROM post WHERE philosopher_id = ? AND title = ? LIMIT 1',
        [thinkers.get(post.philosopher), post.title],
      );
      if (rows.length)
        throw new Error(`Post draft title already exists: ${post.title}`);
    }
    const relationColumn = await runner.hasColumn(
      'followup_answer',
      'question_id',
    );
    for (const question of dailyV1) {
      await runner.query(
        'INSERT INTO question (`usage`, type, title, stage1Body, followupBody, imageKey, isActive, status) VALUES (?, ?, ?, ?, ?, ?, 0, ?)',
        [
          'daily',
          question.followup ? 'twoStage' : 'single',
          question.title,
          question.body,
          question.followup?.body ?? null,
          contentImage(question.image),
          'draft',
        ],
      );
      const id = await this.insertedId(runner);
      await runner.query(
        'INSERT INTO question_category (questionId, categoryId) VALUES (?, ?)',
        [id, categories.get(question.category)],
      );
      for (const answer of question.answers) {
        await runner.query(
          'INSERT INTO answer (questionId, philosopherId, body, explanation) VALUES (?, ?, ?, ?)',
          [
            id,
            thinkers.get(answer.philosopher),
            answer.body,
            answer.explanation,
          ],
        );
      }
      for (const answer of question.followup?.answers ?? []) {
        if (relationColumn)
          await runner.query(
            'INSERT INTO followup_answer (questionId, question_id, body, explanation) VALUES (?, ?, ?, ?)',
            [id, id, answer.body, answer.explanation],
          );
        else
          await runner.query(
            'INSERT INTO followup_answer (questionId, body, explanation) VALUES (?, ?, ?)',
            [id, answer.body, answer.explanation],
          );
      }
    }
    for (const post of postsV1) {
      await runner.query(
        'INSERT INTO post (philosopher_id, title, image_key, status) VALUES (?, ?, ?, ?)',
        [
          thinkers.get(post.philosopher),
          post.title,
          contentImage(post.image),
          'draft',
        ],
      );
      const id = await this.insertedId(runner);
      for (const [order, body] of post.cards.entries()) {
        await runner.query(
          'INSERT INTO post_segment (post_id, segment_type, body, image_key, sort_order) VALUES (?, ?, ?, NULL, ?)',
          [id, 'text', body, order],
        );
      }
    }
    // Backfill only empty images. Preserve existing question/answer IDs, text and status.
    const originals = onboardingV1.flatMap((category) => category.questions);
    for (const [index, question] of originals.entries()) {
      const rows: Array<{ id: string }> = await runner.query(
        'SELECT CAST(id AS CHAR) AS id FROM question WHERE `usage` = ? AND title = ? LIMIT 2',
        ['onboarding', question.title],
      );
      if (rows.length !== 1)
        throw new Error(
          `Missing or ambiguous onboarding question: ${question.title}`,
        );
      await runner.query(
        "UPDATE question SET imageKey = ? WHERE id = ? AND (imageKey IS NULL OR imageKey = '')",
        [contentImage(onboardingImageThemes[index]), rows[0].id],
      );
    }
  }
  private async named(
    runner: QueryRunner,
    table: 'category' | 'philosopher',
    name: string,
  ): Promise<string> {
    const rows: Array<{ id: string }> = await runner.query(
      `SELECT CAST(id AS CHAR) AS id FROM \`${table}\` WHERE name = ? LIMIT 2`,
      [name],
    );
    if (rows.length !== 1)
      throw new Error(`Missing or ambiguous ${table}: ${name}`);
    return rows[0].id;
  }
  private async insertedId(runner: QueryRunner): Promise<string> {
    const [row] = (await runner.query(
      'SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id',
    )) as Array<{ id: string }>;
    return row.id;
  }
  down(): Promise<void> {
    throw new Error(
      'Forward-only editorial migration: use admin review to hold content instead of deleting history',
    );
  }
}
