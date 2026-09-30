import { QueryRunner, Table, TableColumn } from 'typeorm';
import { OnboardingAnalysis1790726400000 } from './1790726400000-OnboardingAnalysis';

describe('onboarding/analysis incremental migration', () => {
  it('adds only missing structures and can recover after partially applied MySQL DDL', async () => {
    const tables = new Set(['users', 'user_summary']);
    const columns = new Set(['status']);
    const createTable = jest.fn((table: Table) => {
      tables.add(table.name);
      return Promise.resolve();
    });
    const addColumn = jest.fn((_table: string, column: TableColumn) => {
      columns.add(column.name);
      return Promise.resolve();
    });
    const runner = {
      hasTable: jest.fn((name: string) => Promise.resolve(tables.has(name))),
      hasColumn: jest.fn((_table: string, name: string) =>
        Promise.resolve(columns.has(name)),
      ),
      createTable,
      addColumn,
    } as unknown as QueryRunner;
    const migration = new OnboardingAnalysis1790726400000();
    await migration.up(runner);
    await migration.up(runner);
    expect(createTable).toHaveBeenCalledTimes(1);
    expect(addColumn).toHaveBeenCalledTimes(3);
    expect(columns).toEqual(
      new Set([
        'status',
        'sourceFingerprint',
        'generationToken',
        'generationStartedAt',
      ]),
    );
  });
  it('refuses to apply to a database without the baseline', async () => {
    const runner = {
      hasTable: jest.fn().mockResolvedValue(false),
    } as unknown as QueryRunner;
    await expect(
      new OnboardingAnalysis1790726400000().up(runner),
    ).rejects.toThrow('Existing develop schema required');
  });
});
