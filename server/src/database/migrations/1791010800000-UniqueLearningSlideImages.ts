import { MigrationInterface, QueryRunner } from 'typeorm';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { philosophersV1 } from './content/onboarding-v1';
import { articleImage, learningPostsV2 } from './content/learning-posts-v2';
import { slideCredits, slideImages } from './content/learning-slides-v3';
import {
  uniqueSlideCredits,
  uniqueSlideImages,
} from './content/learning-slides-v4';

export class UniqueLearningSlideImages1791010800000 implements MigrationInterface {
  transaction = true;

  async up(runner: QueryRunner): Promise<void> {
    if (!runner.isTransactionActive)
      throw new Error('Unique slide images require a transaction');
    const assets = new Map(
      learningPostsV2.flatMap(uniqueSlideImages).map((i) => [i.imageKey, i]),
    );
    for (const image of assets.values()) {
      const bytes = await readFile(
        resolve(
          process.env.MEDIA_CONTENT_DIRECTORY || 'content-media',
          image.imageKey,
        ),
      );
      if (createHash('sha256').update(bytes).digest('hex') !== image.sha256)
        throw new Error(
          `Unique slide asset checksum mismatch: ${image.imageKey}`,
        );
    }
    const updates: Array<{ id: string; image: string; body: string | null }> =
      [];
    // Validate and lock the complete v3 batch before the first UPDATE. Never
    // overwrite operator edits, replace IDs, change covers or publication state.
    for (const article of learningPostsV2) {
      const posts = (await runner.query(
        'SELECT CAST(p.id AS CHAR) AS id, p.image_key AS imageKey FROM post p JOIN philosopher f ON f.id = p.philosopher_id WHERE p.title = ? AND f.name = ? FOR UPDATE',
        [article.title, philosophersV1[article.philosopher].name],
      )) as Array<{ id: string; imageKey: string | null }>;
      if (
        posts.length !== 1 ||
        posts[0].imageKey !== articleImage(article).imageKey
      )
        throw new Error(`Learning post missing or changed: ${article.title}`);
      const cards = (await runner.query(
        'SELECT CAST(id AS CHAR) AS id, segment_type AS kind, body, image_key AS imageKey, sort_order AS position FROM post_segment WHERE post_id = ? ORDER BY sort_order, id FOR UPDATE',
        [posts[0].id],
      )) as Array<{
        id: string;
        kind: string;
        body: string | null;
        imageKey: string | null;
        position: number;
      }>;
      const bodies = [null, ...article.cards, slideCredits(article)];
      const previous = slideImages(article);
      if (
        cards.length !== 8 ||
        cards.some(
          (c, i) =>
            c.position !== i ||
            c.kind !== (i === 0 ? 'image' : 'text') ||
            c.body !== bodies[i] ||
            c.imageKey !== previous[i].imageKey,
        )
      )
        throw new Error(`Learning cards changed: ${article.title}`);
      const images = uniqueSlideImages(article);
      for (const [i, card] of cards.entries()) {
        const body = i === 7 ? uniqueSlideCredits(article) : card.body;
        if (card.imageKey !== images[i].imageKey || card.body !== body)
          updates.push({ id: card.id, image: images[i].imageKey, body });
      }
    }
    for (const update of updates)
      await runner.query(
        'UPDATE post_segment SET image_key = ?, body = ? WHERE id = ?',
        [update.image, update.body, update.id],
      );
  }

  down(): Promise<void> {
    throw new Error(
      'Forward-only unique images: restore reviewed cards from the pre-deploy backup if required',
    );
  }
}
