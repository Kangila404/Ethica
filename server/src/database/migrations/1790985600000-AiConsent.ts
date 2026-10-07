import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
export class AiConsent1790985600000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    for (const column of [
      new TableColumn({
        name: 'aiConsentVersion',
        type: 'varchar',
        length: '24',
        isNullable: true,
      }),
      new TableColumn({
        name: 'aiConsentUpdatedAt',
        type: 'datetime',
        isNullable: true,
      }),
    ]) {
      if (!(await runner.hasColumn('users', column.name)))
        await runner.addColumn('users', column);
    }
  }
  down(): Promise<void> {
    throw new Error('Forward-only: preserve consent records');
  }
}
