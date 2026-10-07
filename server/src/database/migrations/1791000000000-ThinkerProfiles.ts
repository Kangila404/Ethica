import { MigrationInterface, QueryRunner } from 'typeorm';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  thinkerProfilesV1,
  thinkerPortrait,
  portraitAttribution,
} from './content/thinker-profiles-v1';

// Data only: commit the catalog and TypeORM ledger in a single transaction.
export class ThinkerProfiles1791000000000 implements MigrationInterface {
  transaction = true;

  async up(runner: QueryRunner): Promise<void> {
    if (!runner.isTransactionActive)
      throw new Error('Thinker profiles require a migration transaction');
    const directory = resolve(
      process.env.MEDIA_CONTENT_DIRECTORY || 'content-media',
    );
    // Validate every packaged asset and every name BEFORE making any changes.
    for (const profile of thinkerProfilesV1)
      await access(resolve(directory, thinkerPortrait(profile.key).imageKey));
    const existing = new Map<string, { id: string; imageKey: string | null }>();
    for (const profile of thinkerProfilesV1) {
      const rows = (await runner.query(
        'SELECT CAST(id AS CHAR) AS id, imageKey FROM philosopher WHERE name = ? LIMIT 2 FOR UPDATE',
        [profile.name],
      )) as Array<{ id: string; imageKey: string | null }>;
      if (rows.length > 1)
        throw new Error(`Ambiguous philosopher name: ${profile.name}`);
      if (rows.length) existing.set(profile.key, rows[0]);
    }
    for (const profile of thinkerProfilesV1) {
      const image = thinkerPortrait(profile.key);
      const credit = portraitAttribution(profile.key);
      const previous = existing.get(profile.key);
      if (previous) {
        // Preserve IDs, editorial text, operator-uploaded images and all relations.
        // Append attribution only when we actually attach our image; reruns are safe.
        if (!previous.imageKey)
          await runner.query(
            "UPDATE philosopher SET imageKey = ?, lifeRoots = CONCAT(COALESCE(lifeRoots, ''), ?) WHERE id = ? AND (imageKey IS NULL OR imageKey = '')",
            [image.imageKey, credit, previous.id],
          );
      } else {
        await runner.query(
          'INSERT INTO philosopher (name, era, school, coreThought, lifeRoots, imageKey) VALUES (?, ?, ?, ?, ?, ?)',
          [
            profile.name,
            profile.era,
            profile.school,
            profile.coreThought,
            profile.lifeRoots + credit,
            image.imageKey,
          ],
        );
      }
    }
    // Intentionally no post, question, answer, user or affinity-count mutations.
  }

  down(): Promise<void> {
    throw new Error(
      'Forward-only thinker catalog: preserve profiles and linked user history',
    );
  }
}
