import { MigrationInterface, QueryRunner } from 'typeorm';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { thinkerProfilesV1 } from './content/thinker-profiles-v1';
import {
  collectedWorksV11,
  collectedImages,
  collectedCredits,
  validateCollectedWorks,
} from './content/collected-works-v11';

// Append-only publication: 14 major works + 18 Nietzsche + Analects 11–20.
// Every preflight completes before any write. TypeORM owns commit/rollback.
export class PublishCollectedWorks1791172800000 implements MigrationInterface {
  transaction = true;
  async up(runner: QueryRunner): Promise<void> {
    if (!runner.isTransactionActive)
      throw new Error('Collected publication requires a transaction');
    validateCollectedWorks();
    const payload = collectedWorksV11.map((article) => ({
      article,
      images: collectedImages(article),
      credits: collectedCredits(article),
    }));
    const directory = resolve(
      process.env.MEDIA_CONTENT_DIRECTORY || 'content-media',
    );
    const checked = new Set<string>();
    for (const { images } of payload)
      for (const image of images) {
        if (!/^[a-z0-9][a-z0-9-]*\.(jpg|png)$/.test(image.imageKey))
          throw new Error('Unsafe collected image key');
        if (checked.has(image.imageKey)) continue;
        const bytes = await readFile(resolve(directory, image.imageKey));
        if (createHash('sha256').update(bytes).digest('hex') !== image.sha256)
          throw new Error(
            'Collected asset checksum mismatch: ' + image.imageKey,
          );
        checked.add(image.imageKey);
      }
    const thinkers = new Map<string, string>();
    for (const key of new Set(collectedWorksV11.map((p) => p.philosopher))) {
      const profile = thinkerProfilesV1.find((p) => p.key === key);
      if (!profile) throw new Error('Unknown collected thinker: ' + key);
      // Historical spelling alias only; ambiguous matches fail rather than guess.
      const aliases =
        key === 'kant' ? ['이마누엘 칸트', '임마누엘 칸트'] : [profile.name];
      const rows = (await runner.query(
        `SELECT CAST(id AS CHAR) AS id FROM philosopher WHERE name IN (${aliases.map(() => '?').join(',')}) LIMIT 2 FOR UPDATE`,
        aliases,
      )) as Array<{ id: string }>;
      if (rows.length !== 1)
        throw new Error('Missing or ambiguous collected thinker: ' + key);
      thinkers.set(key, rows[0].id);
    }
    for (const { article } of payload) {
      const rows = (await runner.query(
        'SELECT id FROM post WHERE philosopher_id = ? AND title = ? LIMIT 1 FOR UPDATE',
        [thinkers.get(article.philosopher), article.title],
      )) as unknown[];
      if (rows.length)
        throw new Error('Collected title already exists: ' + article.key);
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
      'Forward-only collected publication: never automatically delete published or subsequently edited content',
    );
  }
}
