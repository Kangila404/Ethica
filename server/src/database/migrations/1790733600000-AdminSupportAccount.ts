import { MigrationInterface, QueryRunner, Table } from 'typeorm';
export class AdminSupportAccount1790733600000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    const base = [
      {
        name: 'id',
        type: 'bigint',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment' as const,
      },
      {
        name: 'createdAt',
        type: 'datetime',
        precision: 6,
        default: 'CURRENT_TIMESTAMP(6)',
      },
      {
        name: 'updatedAt',
        type: 'datetime',
        precision: 6,
        default: 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)',
      },
    ];
    const text = [
      { name: 'title', type: 'varchar', length: '200' },
      { name: 'content', type: 'text' },
    ];
    const tables = [
      new Table({
        name: 'inquiry',
        columns: [
          ...base,
          ...text,
          { name: 'userId', type: 'bigint' },
          {
            name: 'status',
            type: 'varchar',
            length: '16',
            default: "'pending'",
          },
          { name: 'answerContent', type: 'text', isNullable: true },
          { name: 'answeredBy', type: 'bigint', isNullable: true },
          { name: 'answeredAt', type: 'datetime', isNullable: true },
        ],
      }),
      new Table({
        name: 'notice',
        columns: [
          ...base,
          ...text,
          { name: 'authorId', type: 'bigint', isNullable: true },
          { name: 'isPublished', type: 'tinyint', default: '0' },
        ],
      }),
      new Table({
        name: 'term',
        columns: [
          ...base,
          ...text,
          { name: 'type', type: 'varchar', length: '16', isUnique: true },
          { name: 'version', type: 'varchar', length: '50' },
        ],
      }),
      new Table({
        name: 'social_revocation_job',
        columns: [
          ...base,
          { name: 'userId', type: 'bigint', isUnique: true },
          { name: 'encryptedCredential', type: 'text', isNullable: true },
          {
            name: 'status',
            type: 'varchar',
            length: '16',
            default: "'pending'",
          },
          { name: 'attempts', type: 'int', default: '0' },
          { name: 'nextAttemptAt', type: 'bigint' },
          { name: 'leaseToken', type: 'char', length: '36', isNullable: true },
          {
            name: 'lastErrorCode',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
        ],
        indices: [
          { name: 'IDX_social_revocation_status', columnNames: ['status'] },
        ],
      }),
    ];
    for (const table of tables)
      if (!(await runner.hasTable(table.name))) await runner.createTable(table);
  }
  down(): Promise<void> {
    throw new Error('Forward-only migration; restore a backup to roll back');
  }
}
