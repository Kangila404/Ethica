import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { QueryRunner } from 'typeorm';
import { ThinkerProfiles1791000000000 } from './1791000000000-ThinkerProfiles';
import {
  thinkerProfilesV1,
  thinkerPortrait,
  portraitAttribution,
} from './content/thinker-profiles-v1';
import portraits from './content/thinker-portraits-v1.json';
import { imageExtension } from '../../media/media.service';

describe('thinker profile catalog', () => {
  it('contains 27 requested profiles and preserves Rawls, with verified non-generated images', () => {
    expect(thinkerProfilesV1).toHaveLength(28);
    expect(portraits).toHaveLength(28);
    expect(new Set(thinkerProfilesV1.map((p) => p.name)).size).toBe(28);
    expect(new Set(thinkerProfilesV1.map((p) => p.key)).size).toBe(28);
    for (const profile of thinkerProfilesV1) {
      expect(profile.name.length).toBeLessThanOrEqual(50);
      expect(profile.era.length).toBeLessThanOrEqual(50);
      expect(profile.school.length).toBeLessThanOrEqual(50);
      expect(profile.coreThought.length).toBeGreaterThan(40);
      expect(profile.lifeRoots.length).toBeGreaterThan(40);
      expect(profile.source).toMatch(/^https:\/\//);
      const image = thinkerPortrait(profile.key);
      const bytes = readFileSync(resolve('content-media', image.imageKey));
      expect(image.imageKey).toMatch(/^[a-z0-9-]+\.(jpg|png)$/);
      expect(image.imageKey.endsWith('.' + imageExtension(bytes))).toBe(true);
      expect(bytes.length).toBeLessThan(2 * 1024 * 1024);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(
        image.sha256,
      );
      expect(image.sourceUrl).toMatch(
        /^https:\/\/commons.wikimedia.org\/wiki\/File:/,
      );
      expect(image.license).toMatch(/^(Public domain|CC BY)/);
      expect(image.creator).not.toMatch(/<[^>]+>/);
      expect(portraitAttribution(profile.key)).toContain(image.sourceUrl);
      expect(portraitAttribution(profile.key)).toContain(image.licenseUrl);
    }
    const odysseus = thinkerProfilesV1.find((p) => p.key === 'odysseus')!;
    expect(odysseus.school).toBe('신화·문학 인물');
    expect(odysseus.lifeRoots).toContain('저자가 아니라 등장인물');
    // Commons' summary metadata may report the sculpture's PD status instead of
    // the photograph's license. Preserve the reviewed file-page conditions.
    expect(thinkerPortrait('socrates').license).toBe('CC BY-SA 2.5');
    expect(thinkerPortrait('plato').license).toBe('CC BY 2.5');
  });

  it('requires a transaction and refuses destructive rollback', async () => {
    const migration = new ThinkerProfiles1791000000000();
    expect(migration.transaction).toBe(true);
    await expect(
      migration.up({ isTransactionActive: false } as QueryRunner),
    ).rejects.toThrow('transaction');
    expect(() => migration.down()).toThrow('Forward-only');
  });

  it('fails before SQL if an image bundle is missing', async () => {
    const previous = process.env.MEDIA_CONTENT_DIRECTORY;
    process.env.MEDIA_CONTENT_DIRECTORY = resolve(
      'missing-thinker-test-assets',
    );
    const query = jest.fn();
    try {
      await expect(
        new ThinkerProfiles1791000000000().up({
          isTransactionActive: true,
          query,
        } as unknown as QueryRunner),
      ).rejects.toThrow();
      expect(query).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.MEDIA_CONTENT_DIRECTORY;
      else process.env.MEDIA_CONTENT_DIRECTORY = previous;
    }
  });

  it('rejects ambiguous existing names before any writes', async () => {
    const query = jest
      .fn<Promise<Array<{ id: string }>>, [string, unknown[]]>()
      .mockResolvedValue([{ id: '1' }, { id: '2' }]);
    await expect(
      new ThinkerProfiles1791000000000().up({
        isTransactionActive: true,
        query,
      } as unknown as QueryRunner),
    ).rejects.toThrow('Ambiguous');
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toMatch(/^SELECT/);
  });
});
