import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PublishPendingMythologies1791590400000 } from '../src/database/migrations/1791590400000-PublishPendingMythologies';
import payload from '../src/database/migrations/content/pending-mythologies-v18.json';

describe('pending mythology atomic publication on disposable MySQL', () => {
  let db: DataSource;
  beforeAll(async () => {
    const database = process.env.ETHICA_TEST_DB,
      port = Number(process.env.ETHICA_TEST_PORT);
    if (
      !database ||
      !/^ethica_verify_[a-z0-9_]+$/.test(database) ||
      !Number.isInteger(port) ||
      port < 1024
    )
      throw new Error('Explicit disposable local test database required');
    db = new DataSource({
      type: 'mysql',
      host: '127.0.0.1',
      port,
      username: process.env.ETHICA_TEST_USER,
      password: process.env.ETHICA_TEST_PASSWORD,
      database,
      entities: [__dirname + '/../src/**/*.entity.ts'],
      synchronize: false,
      logging: false,
      migrations: [PublishPendingMythologies1791590400000],
      migrationsTransactionMode: 'none',
    });
    await db.initialize();
    if ((await db.query<unknown[]>('SHOW TABLES')).length)
      throw new Error('Refusing nonempty test database');
    await db.synchronize();
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });
  it('rolls back every batch on failure, retries, preserves old data and reruns as a no-op', async () => {
    await db.query(
      'INSERT INTO philosopher (name,era,school,coreThought,lifeRoots) VALUES (?,?,?,?,?)',
      [
        payload.profiles[0].name,
        'old era',
        'old school',
        'old thought',
        'old biography',
      ],
    );
    const [owner] = await db.query<Array<{ id: string }>>(
      'SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id',
    );
    await db.query(
      'INSERT INTO learning_profile_category (philosopher_id,category) VALUES (?,?)',
      [owner.id, 'mythology'],
    );
    await db.query(
      'INSERT INTO post (philosopher_id,title,status) VALUES (?,?,?)',
      [owner.id, 'Existing article', 'published'],
    );
    const before = await db.query<unknown[]>('SELECT * FROM post');
    const profiles = await db.query<unknown[]>('SELECT * FROM philosopher');
    const runner = db.createQueryRunner();
    const original = runner.query.bind(runner) as (
      sql: string,
      params?: unknown[],
      structured?: boolean,
    ) => Promise<unknown>;
    let slides = 0;
    jest
      .spyOn(runner, 'query')
      .mockImplementation(
        (sql: string, params?: unknown[], structured?: boolean) => {
          if (sql.startsWith('INSERT INTO post_segment') && ++slides === 600)
            return Promise.reject(new Error('injected publication failure'));
          return original(sql, params, structured);
        },
      );
    const hook = jest
      .spyOn(db, 'createQueryRunner')
      .mockReturnValueOnce(runner);
    try {
      await expect(db.runMigrations()).rejects.toThrow(
        'injected publication failure',
      );
    } finally {
      hook.mockRestore();
    }
    expect(await db.query('SELECT * FROM post')).toEqual(before);
    expect(await db.query('SELECT * FROM philosopher')).toEqual(profiles);
    expect(await db.query('SELECT * FROM post_segment')).toHaveLength(0);
    expect(await db.query('SELECT * FROM migrations')).toHaveLength(0);
    expect(await db.runMigrations()).toHaveLength(1);
    expect(await db.runMigrations()).toHaveLength(0);
    expect(await db.query('SELECT * FROM philosopher')).toHaveLength(4);
    expect(await db.query('SELECT * FROM post_segment')).toHaveLength(1082);
    expect(
      await db.query('SELECT * FROM post WHERE title=?', ['Existing article']),
    ).toEqual(before);
    expect(
      await db.query('SELECT * FROM philosopher WHERE id=?', [owner.id]),
    ).toEqual(profiles);
    for (const post of payload.posts) {
      const [row] = await db.query<Array<{ id: string; status: string }>>(
        'SELECT id,status FROM post WHERE title=?',
        [post.title],
      );
      expect(row.status).toBe('published');
      const actual = await db.query<unknown[]>(
        'SELECT segment_type AS segmentType,body,image_key AS imageKey FROM post_segment WHERE post_id=? ORDER BY sort_order',
        [row.id],
      );
      expect(actual).toEqual(post.segments);
    }
  });
});
