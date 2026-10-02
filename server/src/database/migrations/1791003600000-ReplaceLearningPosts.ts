import { MigrationInterface, QueryRunner } from 'typeorm';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { postsV1, contentImage } from './content/editorial-v1';
import { philosophersV1, ThinkerKey } from './content/onboarding-v1';
import {
  articleCredits,
  articleImage,
  learningPostsV2,
} from './content/learning-posts-v2';

// Explicitly approved replacement of the five v1 posts, not a table-wide purge.
// deploy.sh takes a database backup with the API stopped before this migration.
export class ReplaceLearningPosts1791003600000 implements MigrationInterface {
  transaction = true;

  async up(runner: QueryRunner): Promise<void> {
    if (!runner.isTransactionActive)
      throw new Error('Learning replacement requires a transaction');
    const directory = resolve(
      process.env.MEDIA_CONTENT_DIRECTORY || 'content-media',
    );
    for (const post of learningPostsV2) {
      const image = articleImage(post);
      const bytes = await readFile(resolve(directory, image.imageKey));
      if (createHash('sha256').update(bytes).digest('hex') !== image.sha256)
        throw new Error(`Learning asset checksum mismatch: ${image.imageKey}`);
    }
    const thinkers = new Map<ThinkerKey, string>();
    for (const key of new Set(learningPostsV2.map((p) => p.philosopher))) {
      const rows = (await runner.query(
        'SELECT CAST(id AS CHAR) AS id FROM philosopher WHERE name = ? LIMIT 2 FOR UPDATE',
        [philosophersV1[key].name],
      )) as Array<{ id: string }>;
      if (rows.length !== 1)
        throw new Error(`Missing or ambiguous philosopher: ${key}`);
      thinkers.set(key, rows[0].id);
    }
    // Validate all targets and all new titles before the first write. Refuse an
    // operator-edited legacy article rather than silently destroying their work.
    const legacyIds: string[] = [];
    for (const post of postsV1) {
      const rows = (await runner.query(
        'SELECT CAST(id AS CHAR) AS id, image_key AS imageKey FROM post WHERE philosopher_id = ? AND title = ? LIMIT 2 FOR UPDATE',
        [thinkers.get(post.philosopher), post.title],
      )) as Array<{ id: string; imageKey: string | null }>;
      if (rows.length !== 1 || rows[0].imageKey !== contentImage(post.image))
        throw new Error(`Legacy post missing or changed: ${post.title}`);
      const cards = (await runner.query(
        'SELECT segment_type AS kind, body, image_key AS imageKey, sort_order AS position FROM post_segment WHERE post_id = ? ORDER BY sort_order, id FOR UPDATE',
        [rows[0].id],
      )) as Array<{
        kind: string;
        body: string;
        imageKey: string | null;
        position: number;
      }>;
      if (
        cards.length !== post.cards.length ||
        cards.some(
          (card, i) =>
            card.kind !== 'text' ||
            card.body !== post.cards[i] ||
            card.imageKey !== null ||
            card.position !== i,
        )
      )
        throw new Error(`Legacy cards changed: ${post.title}`);
      legacyIds.push(rows[0].id);
    }
    for (const post of learningPostsV2) {
      const rows = (await runner.query(
        'SELECT id FROM post WHERE philosopher_id = ? AND title = ? LIMIT 1 FOR UPDATE',
        [thinkers.get(post.philosopher), post.title],
      )) as unknown[];
      if (rows.length)
        throw new Error(`Learning title already exists: ${post.title}`);
    }
    for (const id of legacyIds)
      await runner.query('DELETE FROM post WHERE id = ?', [id]); // FK cascades only its cards.
    for (const post of learningPostsV2) {
      const imageKey = articleImage(post).imageKey;
      await runner.query(
        'INSERT INTO post (philosopher_id, title, image_key, status) VALUES (?, ?, ?, ?)',
        [thinkers.get(post.philosopher), post.title, imageKey, 'published'],
      );
      const [row] = (await runner.query(
        'SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id',
      )) as Array<{ id: string }>;
      const cards = [
        { kind: 'image', body: null, image: imageKey },
        ...post.cards.map((body) => ({ kind: 'text', body, image: null })),
        { kind: 'text', body: articleCredits(post), image: null },
      ];
      for (const [order, card] of cards.entries())
        await runner.query(
          'INSERT INTO post_segment (post_id, segment_type, body, image_key, sort_order) VALUES (?, ?, ?, ?, ?)',
          [row.id, card.kind, card.body, card.image, order],
        );
    }
    // Questions, answers, user history, profiles and shared v1 media are untouched.
  }

  down(): Promise<void> {
    throw new Error(
      'Forward-only learning replacement: restore reviewed posts from the pre-deploy backup if required',
    );
  }
}
