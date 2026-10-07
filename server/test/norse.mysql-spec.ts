import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PublishNorseMythology1791417600000 } from '../src/database/migrations/1791417600000-PublishNorseMythology';
import {
  norseArticlesV12,
  norseProfileV12,
} from '../src/database/migrations/content/norse-series-v12';

// Dedicated disposable LOCAL MySQL only; never load .env or contact the NAS.
describe('Norse batch on isolated MySQL', () => {
  let db: DataSource;
  beforeAll(async () => {
    const database = process.env.ETHICA_TEST_DB;
    const port = Number(process.env.ETHICA_TEST_PORT);
    if (
      !database ||
      !/^ethica_verify_[a-z0-9_]+$/.test(database) ||
      !Number.isInteger(port) ||
      port < 1024
    )
      throw new Error(
        'Explicit disposable ethica_verify_* database and local test port required',
      );
    db = new DataSource({
      type: 'mysql',
      host: '127.0.0.1',
      port,
      username: process.env.ETHICA_TEST_USER || 'root',
      password: process.env.ETHICA_TEST_PASSWORD || '',
      database,
      entities: [__dirname + '/../src/**/*.entity.ts'],
      synchronize: false,
      logging: false,
      migrations: [PublishNorseMythology1791417600000],
      migrationsTransactionMode: 'none',
    });
    await db.initialize();
    const tables = await db.query<unknown[]>('SHOW TABLES');
    if (tables.length)
      throw new Error('Refusing to alter a non-empty verification database');
    await db.synchronize();
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });

  it('rolls back a mid-batch failure and ledger, retries once, preserves prior content, then reruns as no-op', async () => {
    await db.query(
      'INSERT INTO philosopher (name, era, school, coreThought, lifeRoots) VALUES (?, ?, ?, ?, ?)',
      ['기존 프로필', '기존 시대', '기존 학파', '기존 사상', '기존 소개'],
    );
    const [owner] = await db.query<Array<{ id: string }>>(
      'SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id',
    );
    await db.query(
      'INSERT INTO post (philosopher_id, title, status) VALUES (?, ?, ?)',
      [owner.id, '기존 게시글 유지', 'published'],
    );
    const before = await db.query<unknown[]>('SELECT * FROM post');
    const runner = db.createQueryRunner();
    const original = runner.query.bind(runner) as (
      sql: string,
      params?: unknown[],
      structured?: boolean,
    ) => Promise<unknown>;
    let insertedSlides = 0;
    jest
      .spyOn(runner, 'query')
      .mockImplementation(
        (sql: string, params?: unknown[], structured?: boolean) => {
          if (
            sql.startsWith('INSERT INTO post_segment') &&
            ++insertedSlides === 31
          )
            return Promise.reject(new Error('injected Norse batch failure'));
          return original(sql, params, structured);
        },
      );
    const hook = jest
      .spyOn(db, 'createQueryRunner')
      .mockReturnValueOnce(runner);
    try {
      await expect(db.runMigrations()).rejects.toThrow(
        'injected Norse batch failure',
      );
    } finally {
      hook.mockRestore();
    }
    expect(await db.query('SELECT * FROM post')).toEqual(before);
    expect(
      await db.query('SELECT * FROM philosopher WHERE name = ?', [
        norseProfileV12.name,
      ]),
    ).toHaveLength(0);
    expect(await db.query('SELECT * FROM post_segment')).toHaveLength(0);
    expect(await db.query('SELECT * FROM migrations')).toHaveLength(0);

    expect(await db.runMigrations()).toHaveLength(1);
    expect(await db.runMigrations()).toHaveLength(0);
    const [profile] = await db.query<Array<{ id: string }>>(
      'SELECT CAST(id AS CHAR) AS id FROM philosopher WHERE name = ?',
      [norseProfileV12.name],
    );
    const posts = await db.query<
      Array<{ id: string; title: string; status: string }>
    >(
      'SELECT id, title, status FROM post WHERE philosopher_id = ? ORDER BY id',
      [profile.id],
    );
    expect(posts.map((p) => p.title)).toEqual(
      norseArticlesV12.map((p) => p.title),
    );
    expect(posts.every((p) => p.status === 'published')).toBe(true);
    expect(
      await db.query(
        'SELECT category FROM learning_profile_category WHERE philosopher_id = ?',
        [profile.id],
      ),
    ).toEqual([{ category: 'mythology' }]);
    const segments = await db.query<
      Array<{ image_key: string; post_id: string; sort_order: number }>
    >(
      'SELECT s.* FROM post_segment s JOIN post p ON p.id = s.post_id WHERE p.philosopher_id = ?',
      [profile.id],
    );
    expect(segments).toHaveLength(252);
    expect(segments.every((s) => Boolean(s.image_key))).toBe(true);
    for (const post of posts) {
      const group = segments.filter(
        (s) => String(s.post_id) === String(post.id),
      );
      expect(group).toHaveLength(14);
      expect(new Set(group.map((s) => s.image_key)).size).toBe(14);
      expect(group.map((s) => s.sort_order).sort((a, b) => a - b)).toEqual(
        Array.from({ length: 14 }, (_, i) => i),
      );
    }
    expect(
      await db.query('SELECT * FROM post WHERE philosopher_id = ?', [owner.id]),
    ).toEqual(before);
  });
});
