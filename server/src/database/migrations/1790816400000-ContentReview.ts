import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
export class ContentReview1790816400000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    for (const table of ['question', 'post']) {
      if (!(await runner.hasColumn(table, 'status'))) {
        // Nullable intermediate column makes interruption/retry safe.
        await runner.addColumn(
          table,
          new TableColumn({
            name: 'status',
            type: 'enum',
            enum: ['draft', 'published', 'held'],
            isNullable: true,
          }),
        );
      }
      await runner.query(
        table === 'question'
          ? "UPDATE question SET status = IF(isActive, 'published', 'held') WHERE status IS NULL"
          : "UPDATE post SET status = 'published' WHERE status IS NULL",
      );
      await runner.changeColumn(
        table,
        'status',
        new TableColumn({
          name: 'status',
          type: 'enum',
          enum: ['draft', 'published', 'held'],
          default: "'draft'",
          isNullable: false,
        }),
      );
    }
    await runner.changeColumn(
      'question',
      'isActive',
      new TableColumn({ name: 'isActive', type: 'tinyint', default: 0 }),
    );
  }
  down(): Promise<void> {
    return Promise.reject(
      new Error('Review status must be retained to avoid exposing drafts.'),
    );
  }
}
