import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

// Incremental migration from the develop schema merged in PR #10.
export class OnboardingAnalysis1790726400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (
      !(await queryRunner.hasTable('users')) ||
      !(await queryRunner.hasTable('user_summary'))
    ) {
      throw new Error(
        'Existing develop schema required before this incremental migration',
      );
    }
    if (!(await queryRunner.hasTable('onboarding_session'))) {
      await queryRunner.createTable(
        new Table({
          name: 'onboarding_session',
          columns: [
            { name: 'userId', type: 'bigint', isPrimary: true },
            { name: 'questionIds', type: 'json' },
            { name: 'completedCount', type: 'int', default: 0 },
            { name: 'draftAnswerId', type: 'bigint', isNullable: true },
            { name: 'resultRequested', type: 'tinyint', default: 0 },
          ],
        }),
      );
    }
    const columns = [
      new TableColumn({
        name: 'status',
        type: 'varchar',
        length: '16',
        default: "'pending'",
      }),
      new TableColumn({
        name: 'sourceFingerprint',
        type: 'char',
        length: '64',
        isNullable: true,
      }),
      new TableColumn({
        name: 'generationToken',
        type: 'char',
        length: '36',
        isNullable: true,
      }),
      new TableColumn({
        name: 'generationStartedAt',
        type: 'datetime',
        isNullable: true,
      }),
    ];
    for (const column of columns) {
      if (!(await queryRunner.hasColumn('user_summary', column.name))) {
        await queryRunner.addColumn('user_summary', column);
      }
    }
  }

  down(): Promise<void> {
    // Do not silently discard persisted onboarding progress during a rollback.
    throw new Error(
      'Forward-only migration: restore a reviewed database backup to roll back',
    );
  }
}
