import { MigrationInterface, QueryRunner } from 'typeorm';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  norseArticlesV12,
  norseProfileV12,
  norseImagesV12,
  norseImages,
  norseCredits,
  validateNorseV12,
} from './content/norse-series-v12';

// User lifted the local-only hold and authorized NAS publication on 2026-10-07.
// Once deployed, this additive data migration publishes all 18 posts atomically.
export class PublishNorseMythology1791417600000 implements MigrationInterface {
  transaction = true;

  async up(runner: QueryRunner): Promise<void> {
    if (!runner.isTransactionActive)
      throw new Error('Norse publication requires a transaction');
    validateNorseV12();
    const payload = norseArticlesV12.map((article) => ({
      article,
      images: norseImages(article),
      credits: norseCredits(article),
    }));
    const directory = resolve(
      process.env.MEDIA_CONTENT_DIRECTORY || 'content-media',
    );
    const used = new Set([
      norseProfileV12.imageKey,
      ...payload.flatMap(({ images }) => images.map((image) => image.imageKey)),
    ]);
    // Before the first DB write, verify every binary against the frozen manifest.
    for (const image of norseImagesV12) {
      if (!used.has(image.imageKey)) continue;
      const bytes = await readFile(resolve(directory, image.imageKey));
      if (createHash('sha256').update(bytes).digest('hex') !== image.sha256)
        throw new Error('Norse asset checksum mismatch: ' + image.imageKey);
    }
    const profiles = (await runner.query(
      'SELECT id FROM philosopher WHERE name = ? LIMIT 2 FOR UPDATE',
      [norseProfileV12.name],
    )) as unknown[];
    if (profiles.length)
      throw new Error('Norse profile already exists; reconcile explicitly');
    for (const { article } of payload) {
      const existing = (await runner.query(
        'SELECT id FROM post WHERE title = ? LIMIT 1 FOR UPDATE',
        [article.title],
      )) as unknown[];
      if (existing.length)
        throw new Error('Norse title already exists: ' + article.key);
    }
    const profile = norseProfileV12;
    await runner.query(
      'INSERT INTO philosopher (name, era, school, coreThought, lifeRoots, imageKey) VALUES (?, ?, ?, ?, ?, ?)',
      [
        profile.name,
        profile.era,
        profile.school,
        profile.coreThought,
        profile.lifeRoots,
        profile.imageKey,
      ],
    );
    const [owner] = (await runner.query(
      'SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id',
    )) as Array<{ id: string }>;
    await runner.query(
      'INSERT INTO learning_profile_category (philosopher_id, category) VALUES (?, ?)',
      [owner.id, profile.category],
    );
    for (const { article, images, credits } of payload) {
      await runner.query(
        'INSERT INTO post (philosopher_id, title, image_key, status) VALUES (?, ?, ?, ?)',
        [owner.id, article.title, images[0].imageKey, 'published'],
      );
      const [post] = (await runner.query(
        'SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id',
      )) as Array<{ id: string }>;
      const bodies: Array<string | null> = [null, ...article.cards, credits];
      for (const [order, image] of images.entries())
        await runner.query(
          'INSERT INTO post_segment (post_id, segment_type, body, image_key, sort_order) VALUES (?, ?, ?, ?, ?)',
          [
            post.id,
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
      'Forward-only Norse publication: preserve published content and user history',
    );
  }
}
