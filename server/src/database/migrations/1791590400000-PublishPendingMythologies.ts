import { MigrationInterface, QueryRunner } from 'typeorm';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import payload from './content/pending-mythologies-v18.json';

export function validatePendingMythologies(): void {
  const fail = (message: string): never => {
    throw new Error(message);
  };
  if (
    payload.profiles.length !== 4 ||
    payload.posts.length !== 82 ||
    payload.posts.reduce((n, p) => n + p.segments.length, 0) !== 1082
  )
    fail('Unexpected approved mythology batch size');
  const assets = new Map(payload.assets.map((a) => [a.imageKey, a]));
  const owners = new Set(payload.profiles.map((p) => p.key));
  if (
    assets.size !== payload.assets.length ||
    owners.size !== 4 ||
    new Set(payload.posts.map((p) => p.title)).size !== 82
  )
    fail('Duplicate publication identity');
  for (const asset of payload.assets) {
    if (
      !/^[a-z0-9-]+\.(jpg|png)$/.test(asset.imageKey) ||
      !/^[a-f0-9]{64}$/.test(asset.sha256)
    )
      fail('Invalid asset identity');
  }
  for (const profile of payload.profiles) {
    if (
      profile.category !== 'mythology' ||
      (!profile.existing &&
        (!assets.has(profile.imageKey) ||
          !profile.lifeRoots.includes('[프로필 이미지]')))
    )
      fail('Invalid mythology profile');
  }
  for (const post of payload.posts) {
    if (
      !owners.has(post.philosopherKey) ||
      post.imageKey !== post.segments[0].imageKey ||
      post.segments[0].segmentType !== 'image' ||
      post.segments[0].body !== null
    )
      fail('Invalid post cover');
    const files = new Set<string>(),
      hashes = new Set<string>(),
      works = new Set<string>();
    for (const [index, segment] of post.segments.entries()) {
      const asset = assets.get(segment.imageKey);
      if (!asset) fail('Missing slide image');
      if (
        index &&
        (segment.segmentType !== 'text' ||
          !segment.body?.trim() ||
          segment.body.length > 10000)
      )
        fail('Invalid slide body');
      files.add(segment.imageKey);
      hashes.add(asset!.sha256);
      works.add(asset!.artworkId);
    }
    if (
      [files.size, hashes.size, works.size].some(
        (n) => n !== post.segments.length,
      )
    )
      fail('Repeated artwork within article: ' + post.key);
  }
}

// Approved 2026-10-09. Append-only: never replace old posts, profiles or user data.
export class PublishPendingMythologies1791590400000 implements MigrationInterface {
  transaction = true;
  async up(runner: QueryRunner): Promise<void> {
    if (!runner.isTransactionActive)
      throw new Error('Publication requires a transaction');
    validatePendingMythologies();
    const directory = resolve(
      process.env.MEDIA_CONTENT_DIRECTORY || 'content-media',
    );
    for (const asset of payload.assets) {
      const bytes = await readFile(resolve(directory, asset.imageKey));
      if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256)
        throw new Error('Asset checksum mismatch: ' + asset.imageKey);
    }
    const owners = new Map<string, string>();
    // Preflight every conflict before any write. Greek must already exist exactly once.
    for (const profile of payload.profiles) {
      const rows = (await runner.query(
        'SELECT CAST(id AS CHAR) AS id FROM philosopher WHERE name = ? LIMIT 2 FOR UPDATE',
        [profile.name],
      )) as Array<{ id: string }>;
      if (rows.length !== (profile.existing ? 1 : 0))
        throw new Error('Profile conflict: ' + profile.key);
      if (profile.existing) {
        const categories = (await runner.query(
          'SELECT category FROM learning_profile_category WHERE philosopher_id = ?',
          [rows[0].id],
        )) as Array<{ category: string }>;
        if (!categories.some((c) => c.category === 'mythology'))
          throw new Error('Existing profile category mismatch');
        owners.set(profile.key, rows[0].id);
      }
    }
    for (const post of payload.posts) {
      const rows = (await runner.query(
        'SELECT id FROM post WHERE title = ? LIMIT 1 FOR UPDATE',
        [post.title],
      )) as unknown[];
      if (rows.length) throw new Error('Title conflict: ' + post.key);
    }
    for (const profile of payload.profiles.filter((p) => !p.existing)) {
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
      owners.set(profile.key, owner.id);
      await runner.query(
        'INSERT INTO learning_profile_category (philosopher_id, category) VALUES (?, ?)',
        [owner.id, 'mythology'],
      );
    }
    for (const post of payload.posts) {
      await runner.query(
        'INSERT INTO post (philosopher_id, title, image_key, status) VALUES (?, ?, ?, ?)',
        [
          owners.get(post.philosopherKey),
          post.title,
          post.imageKey,
          'published',
        ],
      );
      const [row] = (await runner.query(
        'SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id',
      )) as Array<{ id: string }>;
      for (const [order, segment] of post.segments.entries())
        await runner.query(
          'INSERT INTO post_segment (post_id, segment_type, body, image_key, sort_order) VALUES (?, ?, ?, ?, ?)',
          [row.id, segment.segmentType, segment.body, segment.imageKey, order],
        );
    }
  }
  down(): Promise<void> {
    throw new Error('Forward-only publication; preserve reader history');
  }
}
