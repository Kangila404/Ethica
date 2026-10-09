import { QueryRunner } from 'typeorm';
import {
  PublishPendingMythologies1791590400000,
  validatePendingMythologies,
} from './1791590400000-PublishPendingMythologies';
import payload from './content/pending-mythologies-v18.json';

describe('approved pending mythologies', () => {
  function fixture(conflict = '') {
    let id = 1000;
    const query = jest.fn((sql: string, params?: unknown[]) => {
      if (sql.includes('FROM philosopher'))
        return Promise.resolve(
          params?.[0] === payload.profiles[0].name
            ? [{ id: '30' }]
            : conflict === 'profile'
              ? [{ id: '31' }]
              : [],
        );
      if (sql.includes('FROM learning_profile_category'))
        return Promise.resolve([{ category: 'mythology' }]);
      if (sql.includes('FROM post WHERE'))
        return Promise.resolve(conflict === 'title' ? [{ id: '99' }] : []);
      if (sql.includes('LAST_INSERT_ID'))
        return Promise.resolve([{ id: String(++id) }]);
      return Promise.resolve([]);
    });
    return {
      query,
      runner: { isTransactionActive: true, query } as unknown as QueryRunner,
    };
  }
  it('validates all 82 articles and their non-repeating slide artworks', () => {
    expect(() => validatePendingMythologies()).not.toThrow();
    expect(payload.assets).toHaveLength(555);
  });
  it('verifies all media and only appends three profiles, 82 published posts and 1082 slides', async () => {
    const { runner, query } = fixture();
    await new PublishPendingMythologies1791590400000().up(runner);
    const calls = query.mock.calls;
    expect(
      calls.filter(([s]) => s.startsWith('INSERT INTO philosopher')),
    ).toHaveLength(3);
    const posts = calls.filter(([s]) => s.startsWith('INSERT INTO post '));
    expect(posts).toHaveLength(82);
    expect(posts.every(([, p]) => p?.[3] === 'published')).toBe(true);
    expect(
      calls.filter(([s]) => s.startsWith('INSERT INTO post_segment')),
    ).toHaveLength(1082);
    expect(
      calls.some(([s]) => /^(UPDATE|DELETE|DROP|TRUNCATE|ALTER)/.test(s)),
    ).toBe(false);
  });
  it.each(['profile', 'title'])(
    'rejects %s conflicts before any writes',
    async (conflict) => {
      const { runner, query } = fixture(conflict);
      await expect(
        new PublishPendingMythologies1791590400000().up(runner),
      ).rejects.toThrow(/conflict/i);
      expect(query.mock.calls.some(([s]) => s.startsWith('INSERT'))).toBe(
        false,
      );
    },
  );
  it('requires transaction and refuses destructive rollback', async () => {
    const migration = new PublishPendingMythologies1791590400000();
    await expect(
      migration.up({ isTransactionActive: false } as QueryRunner),
    ).rejects.toThrow('transaction');
    expect(() => migration.down()).toThrow('Forward-only');
  });
});
