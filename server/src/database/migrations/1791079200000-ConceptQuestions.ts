import { MigrationInterface, QueryRunner } from 'typeorm';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { conceptCategoriesV2, conceptQuestionsV2 } from './content/concepts-v2';
import { conceptThinkers, ConceptThinker } from './content/concepts-v2/types';

// Explicit user approval: publish 49 verified questions, keep all previous content.
export class ConceptQuestions1791079200000 implements MigrationInterface {
  transaction = true;

  async up(runner: QueryRunner): Promise<void> {
    if (!runner.isTransactionActive)
      throw new Error('Concept questions require a transaction');
    const directory = resolve(
      process.env.MEDIA_CONTENT_DIRECTORY || 'content-media',
    );
    for (const q of conceptQuestionsV2)
      await access(resolve(directory, q.imageKey));

    const thinkers = new Map<ConceptThinker, string>();
    for (const [key, thinker] of Object.entries(conceptThinkers)) {
      const rows = await this.named(runner, 'philosopher', thinker.name);
      if (rows.length !== 1)
        throw new Error(`Missing or ambiguous thinker: ${thinker.name}`);
      thinkers.set(key as ConceptThinker, rows[0].id);
    }
    // Preflight before any insert; never adopt or overwrite a matching question.
    for (const q of conceptQuestionsV2) {
      const rows = (await runner.query(
        'SELECT id FROM question WHERE title = ? LIMIT 1 FOR UPDATE',
        [q.title],
      )) as unknown[];
      if (rows.length)
        throw new Error(`Concept question title conflict: ${q.title}`);
    }
    const categories = new Map<string, string>();
    for (const category of conceptCategoriesV2) {
      const rows = await this.named(runner, 'category', category.name);
      if (rows.length > 1)
        throw new Error(`Ambiguous category: ${category.name}`);
      if (rows.length === 1) categories.set(category.name, rows[0].id);
    }
    const [last] = (await runner.query(
      'SELECT COALESCE(MAX(sortOrder), 0) AS value FROM category',
    )) as Array<{ value: number }>;
    let order = Number(last.value);
    for (const category of conceptCategoriesV2) {
      if (!categories.has(category.name)) {
        await runner.query(
          'INSERT INTO category (name, sortOrder) VALUES (?, ?)',
          [category.name, ++order],
        );
        categories.set(category.name, await this.insertedId(runner));
      }
    }
    const legacyRelation = await runner.hasColumn(
      'followup_answer',
      'question_id',
    );
    for (const q of conceptQuestionsV2) {
      await runner.query(
        'INSERT INTO question (`usage`, type, title, stage1Body, followupBody, imageKey, isActive, status) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
        [
          q.usage,
          q.type,
          q.title,
          q.body,
          q.followup?.body ?? null,
          q.imageKey,
          'published',
        ],
      );
      const id = await this.insertedId(runner);
      await runner.query(
        'INSERT INTO question_category (questionId, categoryId) VALUES (?, ?)',
        [id, categories.get(q.category)],
      );
      for (const answer of q.answers) {
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
      for (const answer of q.followup?.answers ?? []) {
        if (legacyRelation) {
          await runner.query(
            'INSERT INTO followup_answer (questionId, question_id, body, explanation) VALUES (?, ?, ?, ?)',
            [id, id, answer.body, answer.explanation],
          );
        } else {
          await runner.query(
            'INSERT INTO followup_answer (questionId, body, explanation) VALUES (?, ?, ?)',
            [id, answer.body, answer.explanation],
          );
        }
      }
    }
  }

  private async named(
    runner: QueryRunner,
    table: 'category' | 'philosopher',
    name: string,
  ): Promise<Array<{ id: string }>> {
    return runner.query(
      `SELECT CAST(id AS CHAR) AS id FROM \`${table}\` WHERE name = ? LIMIT 2 FOR UPDATE`,
      [name],
    ) as Promise<Array<{ id: string }>>;
  }
  private async insertedId(runner: QueryRunner): Promise<string> {
    const [row] = (await runner.query(
      'SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id',
    )) as Array<{ id: string }>;
    return row.id;
  }
  down(): Promise<void> {
    throw new Error(
      'Forward-only: preserve question and answer history; hold content through admin review',
    );
  }
}
