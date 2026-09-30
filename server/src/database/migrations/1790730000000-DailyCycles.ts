import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class DailyCycles1790730000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    const add = async (table: string, column: TableColumn) => {
      if (!(await runner.hasColumn(table, column.name)))
        await runner.addColumn(table, column);
    };
    await add(
      'users',
      new TableColumn({
        name: 'nextDailyAt',
        type: 'bigint',
        isNullable: true,
      }),
    );
    await add(
      'users',
      new TableColumn({
        name: 'pendingDailyQuestionTime',
        type: 'time',
        isNullable: true,
      }),
    );
    await add(
      'users',
      new TableColumn({
        name: 'pendingTimezone',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }),
    );
    await add(
      'users',
      new TableColumn({
        name: 'dailyScheduleEffectiveAt',
        type: 'bigint',
        isNullable: true,
      }),
    );
    await add(
      'user_answer',
      new TableColumn({ name: 'serviceDate', type: 'date', isNullable: true }),
    );
    const table = await runner.getTable('user_daily_question');
    if (!table) throw new Error('Daily baseline table is required');
    for (const index of table.indices) {
      if (
        index.isUnique &&
        index.columnNames.length === 2 &&
        index.columnNames.includes('serviceDate')
      )
        await runner.dropIndex(table, index);
    }
    for (const unique of table.uniques) {
      if (
        unique.columnNames.length === 2 &&
        unique.columnNames.includes('serviceDate')
      )
        await runner.dropUniqueConstraint(table, unique);
    }
    await runner.changeColumn(
      'user_daily_question',
      'questionId',
      new TableColumn({ name: 'questionId', type: 'bigint', isNullable: true }),
    );
    await runner.changeColumn(
      'user_daily_question',
      'status',
      new TableColumn({
        name: 'status',
        type: 'enum',
        enum: ['pending', 'completed', 'expired', 'preparing'],
        default: "'pending'",
      }),
    );
    for (const name of ['answerId', 'followupAnswerId'])
      await add(
        'user_daily_question',
        new TableColumn({ name, type: 'bigint', isNullable: true }),
      );
    for (const name of ['openedAt', 'notificationAttemptAt'])
      await add(
        'user_daily_question',
        new TableColumn({ name, type: 'bigint', isNullable: true }),
      );
    await add(
      'user_daily_question',
      new TableColumn({
        name: 'notificationToken',
        type: 'char',
        length: '36',
        isNullable: true,
      }),
    );
    await add(
      'user_daily_question',
      new TableColumn({
        name: 'notificationStatus',
        type: 'varchar',
        length: '16',
        default: "'pending'",
      }),
    );
    await add(
      'user_daily_question',
      new TableColumn({
        name: 'notificationAttempts',
        type: 'int',
        default: '0',
      }),
    );
    // Old assignments were generated at KST midnight. Preserve them until the
    // next scheduled boundary instead of issuing a second question on rollout.
    await runner.query(
      "UPDATE user_daily_question SET notificationStatus = 'skipped' WHERE openedAt IS NULL",
    );
  }
  down(): Promise<void> {
    throw new Error('Forward-only migration; restore a backup to roll back');
  }
}
