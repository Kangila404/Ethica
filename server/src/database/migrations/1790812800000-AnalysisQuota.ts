import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
export class AnalysisQuota1790812800000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    for (const column of [
      new TableColumn({
        name: 'generationDate',
        type: 'date',
        isNullable: true,
      }),
      new TableColumn({ name: 'generationAttempts', type: 'int', default: 0 }),
    ]) {
      if (!(await runner.hasColumn('user_summary', column.name)))
        await runner.addColumn('user_summary', column);
    }
  }
  async down(): Promise<void> {
    throw new Error('Keep quota records to prevent resetting daily usage.');
  }
}
