import { ContentReview1790816400000 } from './1790816400000-ContentReview';
import { QueryRunner } from 'typeorm';
describe('review status migration', () => {
  it('adds status safely, maps legacy visibility only once, and preserves reviewed rows on replay', async () => {
    const columns = new Set<string>();
    const query = jest.fn();
    const addColumn = jest.fn(async (table: string, column: { name: string }) => { columns.add(table + '.' + column.name); });
    const changeColumn = jest.fn();
    const runner = { hasColumn: async (table: string, name: string) => columns.has(table + '.' + name), addColumn, changeColumn, query } as unknown as QueryRunner;
    const migration = new ContentReview1790816400000();
    await migration.up(runner);
    await migration.up(runner);
    expect(addColumn).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenCalledWith("UPDATE question SET status = IF(isActive, 'published', 'held') WHERE status IS NULL");
    expect(query).toHaveBeenCalledWith("UPDATE post SET status = 'published' WHERE status IS NULL");
    expect(changeColumn).toHaveBeenCalledWith('post', 'status', expect.objectContaining({ default: "'draft'", isNullable: false }));
    await expect(migration.down()).rejects.toThrow('avoid exposing drafts');
  });
});
