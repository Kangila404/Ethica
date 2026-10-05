import { MigrationInterface, QueryRunner } from 'typeorm';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { thinkerProfilesV1 } from './content/thinker-profiles-v1';
import { analectsArticlesV8 } from './content/analects-v8';
import { analectsCredits, analectsImages } from './content/analects-images-v8';

// User approved publication of these ten illustrated articles. Append only; never replace
// existing articles or modify users, questions, philosopher profiles or images.
export class PublishAnalects1791158400000 implements MigrationInterface {
  transaction = true;

  async up(runner: QueryRunner): Promise<void> {
    if (!runner.isTransactionActive)
      throw new Error('Analects publication requires a transaction');
    const directory = resolve(
      process.env.MEDIA_CONTENT_DIRECTORY || 'content-media',
    );
    const checked = new Set<string>();
    const payload = analectsArticlesV8.map((article) => ({
      article,
      images: analectsImages(article),
      credits: analectsCredits(article),
    }));
    for (const { images } of payload)
      for (const image of images) {
        if (!/^[a-z0-9][a-z0-9-]*\.(jpg|png)$/.test(image.imageKey))
          throw new Error('Unsafe Analects image key');
        if (checked.has(image.imageKey)) continue;
        const bytes = await readFile(resolve(directory, image.imageKey));
        if (createHash('sha256').update(bytes).digest('hex') !== image.sha256)
          throw new Error(
            `Analects asset checksum mismatch: ${image.imageKey}`,
          );
        checked.add(image.imageKey);
      }
    const thinkers = new Map<string, string>();
    for (const key of new Set(analectsArticlesV8.map((p) => p.philosopher))) {
      const profile = thinkerProfilesV1.find((p) => p.key === key);
      if (!profile) throw new Error(`Unknown Analects thinker: ${key}`);
      const rows = (await runner.query(
        'SELECT CAST(id AS CHAR) AS id FROM philosopher WHERE name = ? LIMIT 2 FOR UPDATE',
        [profile.name],
      )) as Array<{ id: string }>;
      if (rows.length !== 1)
        throw new Error(`Missing or ambiguous Analects thinker: ${key}`);
      thinkers.set(key, rows[0].id);
    }
    for (const { article } of payload) {
      const rows = (await runner.query(
        'SELECT id FROM post WHERE philosopher_id = ? AND title = ? LIMIT 1 FOR UPDATE',
        [thinkers.get(article.philosopher), article.title],
      )) as unknown[];
      if (rows.length)
        throw new Error(`Analects title already exists: ${article.key}`);
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
      'Forward-only Analects publication: never automatically delete published or subsequently edited content',
    );
  }
}
