import { MigrationInterface, QueryRunner } from 'typeorm';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  questionsV3,
  thinkers,
  validateQuestionsV3,
} from './content/dilemmas-v3';

type OldQuestion = { id: string; status: 'draft' | 'held' | 'published' };

export class RevisePhilosophicalDilemmas1792540800000 implements MigrationInterface {
  transaction = true;

  async up(runner: QueryRunner): Promise<void> {
    if (!runner.isTransactionActive)
      throw new Error('Question revision requires a transaction');
    validateQuestionsV3();
    const directory = resolve(
      process.env.MEDIA_CONTENT_DIRECTORY || 'content-media',
    );
    for (const imageKey of new Set(questionsV3.map((q) => q.imageKey)))
      await access(resolve(directory, imageKey));

    const used = new Set(
      questionsV3.flatMap((q) => q.answers.map((a) => a.philosopher)),
    );
    const catalog = thinkers.filter((p) => used.has(p.key));
    if (catalog.length !== used.size)
      throw new Error('Unknown thinker in question revision');
    const philosopherIds = new Map<string, string>();
    for (const p of catalog) {
      const aliases = p.key === 'kant' ? [p.name, '임마누엘 칸트'] : [p.name];
      const rows = (await runner.query(
        `SELECT CAST(id AS CHAR) AS id FROM philosopher WHERE name IN (${aliases.map(() => '?').join(',')}) LIMIT 2 FOR UPDATE`,
        aliases,
      )) as Array<{ id: string }>;
      if (rows.length > 1 || (!p.added && rows.length !== 1))
        throw new Error(`Missing or ambiguous philosopher: ${p.name}`);
      if (rows[0]) philosopherIds.set(p.key, rows[0].id);
    }
    const categories = new Map<string, string>();
    for (const name of new Set(questionsV3.map((q) => q.category))) {
      const rows = (await runner.query(
        'SELECT CAST(id AS CHAR) AS id FROM category WHERE name = ? LIMIT 2 FOR UPDATE',
        [name],
      )) as Array<{ id: string }>;
      if (rows.length !== 1)
        throw new Error(`Missing or ambiguous category: ${name}`);
      categories.set(name, rows[0].id);
    }
    const previous = new Map<string, OldQuestion>();
    for (const q of questionsV3) {
      const conflict = (await runner.query(
        'SELECT id FROM question WHERE title = ? LIMIT 1 FOR UPDATE',
        [q.title],
      )) as unknown[];
      if (conflict.length)
        throw new Error(`Revised question already exists: ${q.title}`);
      const rows = (await runner.query(
        `SELECT CAST(q.id AS CHAR) AS id, q.status FROM question q WHERE q.title IN (${q.replaces.titles.map(() => '?').join(',')}) AND q.\`usage\` = ? AND EXISTS (SELECT 1 FROM question_category qc WHERE qc.questionId = q.id AND qc.categoryId = ?) LIMIT 2 FOR UPDATE`,
        [...q.replaces.titles, q.usage, categories.get(q.category)],
      )) as OldQuestion[];
      if (
        rows.length !== 1 ||
        !['draft', 'held', 'published'].includes(rows[0].status)
      )
        throw new Error(
          `Original question missing/ambiguous; reconcile its title before release: ${q.replaces.title}`,
        );
      previous.set(q.key, rows[0]);
    }
    const legacyRelation = await runner.hasColumn(
      'followup_answer',
      'question_id',
    );

    // Everything above is read-only preflight. Never overwrite existing profiles
    // or source text (including manual line breaks). DML + migration ledger commit
    // together. A failed insert cannot retire any of the previous questions.
    for (const p of catalog) {
      if (philosopherIds.has(p.key)) continue;
      await runner.query(
        'INSERT INTO philosopher (name, era, school, coreThought, lifeRoots, imageKey) VALUES (?, ?, ?, ?, ?, ?)',
        [
          p.name,
          p.era,
          p.school,
          p.coreThought,
          `${p.lifeRoots}\n\n[자료 출처]\n${p.source}`,
          p.imageKey,
        ],
      );
      const id = await this.insertedId(runner);
      philosopherIds.set(p.key, id);
      await runner.query(
        'INSERT INTO learning_profile_category (philosopher_id, category) VALUES (?, ?)',
        [id, 'philosophy'],
      );
    }
    for (const q of questionsV3) {
      const old = previous.get(q.key)!;
      // Preserve the operator's publication decision. Draft/held content never
      // becomes published merely because this edition was shipped.
      await runner.query(
        'INSERT INTO question (`usage`, type, title, stage1Body, followupBody, imageKey, isActive, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          q.usage,
          q.type,
          q.title,
          q.body,
          q.followup?.body ?? null,
          q.imageKey,
          old.status === 'published' ? 1 : 0,
          old.status,
        ],
      );
      const id = await this.insertedId(runner);
      await runner.query(
        'INSERT INTO question_category (questionId, categoryId) VALUES (?, ?)',
        [id, categories.get(q.category)],
      );
      for (const a of q.answers)
        await runner.query(
          'INSERT INTO answer (questionId, philosopherId, body, explanation) VALUES (?, ?, ?, ?)',
          [id, philosopherIds.get(a.philosopher), a.body, a.explanation],
        );
      for (const a of q.followup?.answers ?? []) {
        if (legacyRelation)
          await runner.query(
            'INSERT INTO followup_answer (questionId, question_id, body, explanation) VALUES (?, ?, ?, ?)',
            [id, id, a.body, a.explanation],
          );
        else
          await runner.query(
            'INSERT INTO followup_answer (questionId, body, explanation) VALUES (?, ?, ?)',
            [id, a.body, a.explanation],
          );
      }
      // Selection filters status, not isActive. Historical lookups intentionally
      // still resolve held rows, so today's already assigned question stays intact.
      await runner.query(
        "UPDATE question SET status = 'held', isActive = 0 WHERE id = ? AND status = 'published'",
        [old.id],
      );
    }
  }

  private async insertedId(runner: QueryRunner): Promise<string> {
    const [row] = (await runner.query(
      'SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id',
    )) as Array<{ id: string }>;
    return row.id;
  }
  down(): Promise<void> {
    throw new Error(
      'Forward-only: keep original and revised questions plus user answer history',
    );
  }
}
