import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  onboardingV1,
  philosophersV1,
  ThinkerKey,
} from './content/onboarding-v1';

// DML only: data and the TypeORM migration ledger commit together.
// Run through migration:run, never by importing this into application startup.
export class OnboardingContent1790740800000 implements MigrationInterface {
  transaction = true;

  async up(runner: QueryRunner): Promise<void> {
    if (!runner.isTransactionActive)
      throw new Error('Onboarding content requires a migration transaction');
    for (const table of [
      'category',
      'philosopher',
      'question',
      'answer',
      'followup_answer',
      'question_category',
    ]) {
      if (!(await runner.hasTable(table)))
        throw new Error(
          `Onboarding content requires the existing ${table} table`,
        );
    }
    // Never overwrite or silently adopt a question owned by an administrator.
    for (const category of onboardingV1) {
      for (const question of category.questions) {
        const existing = (await runner.query(
          'SELECT id FROM question WHERE `usage` = ? AND title = ? LIMIT 1',
          ['onboarding', question.title],
        )) as Array<{ id: string }>;
        if (existing.length)
          throw new Error(`Onboarding title already exists: ${question.title}`);
      }
    }
    const philosopherIds = new Map<ThinkerKey, string>();
    for (const key of Object.keys(philosophersV1) as ThinkerKey[]) {
      const philosopher = philosophersV1[key];
      const existing = await this.findNamed(
        runner,
        'philosopher',
        philosopher.name,
      );
      if (existing) {
        philosopherIds.set(key, existing);
      } else {
        await runner.query(
          'INSERT INTO philosopher (name, era, school, coreThought, lifeRoots, imageKey) VALUES (?, ?, ?, ?, ?, NULL)',
          [
            philosopher.name,
            philosopher.era,
            philosopher.school,
            philosopher.coreThought,
            philosopher.lifeRoots,
          ],
        );
        philosopherIds.set(key, await this.insertedId(runner));
      }
    }
    const [ordering] = (await runner.query(
      'SELECT COALESCE(MAX(sortOrder), 0) AS lastSort FROM category',
    )) as Array<{ lastSort: number }>;
    let nextOrder = Number(ordering.lastSort);
    // Legacy mapping uses questionId for submission and question_id for the ORM relation.
    const hasRelationColumn = await runner.hasColumn(
      'followup_answer',
      'question_id',
    );
    for (const category of onboardingV1) {
      let categoryId = await this.findNamed(runner, 'category', category.name);
      if (!categoryId) {
        await runner.query(
          'INSERT INTO category (name, sortOrder) VALUES (?, ?)',
          [category.name, ++nextOrder],
        );
        categoryId = await this.insertedId(runner);
      }
      for (const question of category.questions) {
        await runner.query(
          'INSERT INTO question (`usage`, type, title, stage1Body, followupBody, imageKey, isActive) VALUES (?, ?, ?, ?, ?, NULL, 1)',
          [
            'onboarding',
            question.followup ? 'twoStage' : 'single',
            question.title,
            question.body,
            question.followup?.body ?? null,
          ],
        );
        const questionId = await this.insertedId(runner);
        await runner.query(
          'INSERT INTO question_category (questionId, categoryId) VALUES (?, ?)',
          [questionId, categoryId],
        );
        for (const choice of question.answers) {
          await runner.query(
            'INSERT INTO answer (questionId, philosopherId, body, explanation) VALUES (?, ?, ?, ?)',
            [
              questionId,
              philosopherIds.get(choice.philosopher),
              choice.body,
              choice.explanation,
            ],
          );
        }
        for (const choice of question.followup?.answers ?? []) {
          if (hasRelationColumn) {
            await runner.query(
              'INSERT INTO followup_answer (questionId, question_id, body, explanation) VALUES (?, ?, ?, ?)',
              [questionId, questionId, choice.body, choice.explanation],
            );
          } else {
            await runner.query(
              'INSERT INTO followup_answer (questionId, body, explanation) VALUES (?, ?, ?)',
              [questionId, choice.body, choice.explanation],
            );
          }
        }
      }
    }
  }

  private async findNamed(
    runner: QueryRunner,
    table: 'category' | 'philosopher',
    name: string,
  ): Promise<string | null> {
    const rows = (await runner.query(
      `SELECT CAST(id AS CHAR) AS id FROM \`${table}\` WHERE name = ? LIMIT 2`,
      [name],
    )) as Array<{ id: string }>;
    if (rows.length > 1)
      throw new Error(`Ambiguous existing ${table}: ${name}`);
    return rows[0]?.id ?? null;
  }

  private async insertedId(runner: QueryRunner): Promise<string> {
    const [row] = (await runner.query(
      'SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id',
    )) as Array<{ id: string }>;
    return row.id;
  }

  down(): Promise<void> {
    // Answers and assigned sessions may already reference these rows.
    throw new Error(
      'Forward-only content migration: deactivate questions through admin instead of deleting answer history',
    );
  }
}
