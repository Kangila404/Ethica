import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ProfileAvatar1790902800000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    if (!(await runner.hasColumn('users', 'avatarId'))) {
      await runner.addColumn(
        'users',
        new TableColumn({
          name: 'avatarId',
          type: 'varchar',
          length: '24',
          isNullable: true,
        }),
      );
    }
    const table = await runner.getTable('users');
    const name = table?.findColumnByName('name');
    if (name?.type === 'varchar' && Number(name.length) < 50) {
      const widened = name.clone();
      widened.length = '50';
      await runner.changeColumn('users', name, widened);
    }
  }
  down(): Promise<void> {
    throw new Error(
      'Forward-only: preserve profile choices and longer nicknames.',
    );
  }
}
