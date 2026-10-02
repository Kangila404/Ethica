import { MigrationInterface, QueryRunner } from 'typeorm';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { thinkerProfilesV1 } from './content/thinker-profiles-v1';
import { learningLibraryV5 } from './content/learning-library-v5';
import {
  libraryCredits,
  libraryImages,
} from './content/learning-library-images-v5';

// Explicit user approval: append 54 philosopher posts and five Odyssey parts,
// published. Never update/delete an existing post, card, profile or user row.
export class ExpandLearningLibrary1791025200000 implements MigrationInterface {
  transaction = true;

  async up(runner: QueryRunner): Promise<void> {
    if (!runner.isTransactionActive)
      throw new Error('Library expansion requires a transaction');
    const directory = resolve(
      process.env.MEDIA_CONTENT_DIRECTORY || 'content-media',
    );
    const checked = new Set<string>();
    const payload = learningLibraryV5.map((article) => ({
      article,
      images: libraryImages(article),
      credits: libraryCredits(article),
    }));
    for (const { images } of payload)
      for (const image of images) {
        if (!/^[a-z0-9][a-z0-9-]*\.(jpg|png)$/.test(image.imageKey))
          throw new Error('Unsafe library image key');
        if (checked.has(image.imageKey)) continue;
        const bytes = await readFile(resolve(directory, image.imageKey));
        if (createHash('sha256').update(bytes).digest('hex') !== image.sha256)
          throw new Error(`Library asset checksum mismatch: ${image.imageKey}`);
        checked.add(image.imageKey);
      }
    const thinkers = new Map<string, string>();
    for (const key of new Set(learningLibraryV5.map((p) => p.philosopher))) {
      const profile = thinkerProfilesV1.find((p) => p.key === key);
      if (!profile) throw new Error(`Unknown library thinker: ${key}`);
      const rows = (await runner.query(
        'SELECT CAST(id AS CHAR) AS id FROM philosopher WHERE name = ? LIMIT 2 FOR UPDATE',
        [profile.name],
      )) as Array<{ id: string }>;
      if (rows.length !== 1)
        throw new Error(`Missing or ambiguous library thinker: ${key}`);
      thinkers.set(key, rows[0].id);
    }
    // Whole-batch preflight: an operator-created collision stops everything.
    for (const { article } of payload) {
      const rows = (await runner.query(
        'SELECT id FROM post WHERE philosopher_id = ? AND title = ? LIMIT 1 FOR UPDATE',
        [thinkers.get(article.philosopher), article.title],
      )) as unknown[];
      if (rows.length)
        throw new Error(`Library title already exists: ${article.key}`);
    }
    for (const { article, images, credits } of payload) {
      await runner.query(
        'INSERT INTO post (philosopher_id, title, image_key, status) VALUES (?, ?, ?, ?)',
        [
          thinkers.get(article.philosopher),
          article.title,
          images[0].imageKey,
          'published',
        ],
      );
      const [row] = (await runner.query(
        'SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id',
      )) as Array<{ id: string }>;
      const bodies: Array<string | null> = [null, ...article.cards, credits];
      for (const [order, image] of images.entries())
        await runner.query(
          'INSERT INTO post_segment (post_id, segment_type, body, image_key, sort_order) VALUES (?, ?, ?, ?, ?)',
          [
            row.id,
            order === 0 ? 'image' : 'text',
            bodies[order],
            image.imageKey,
            order,
          ],
        );
    }
  }

  down(): Promise<void> {
    throw new Error(
      'Forward-only library expansion: do not delete published or subsequently edited posts automatically',
    );
  }
}
