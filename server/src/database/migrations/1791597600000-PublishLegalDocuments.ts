import { MigrationInterface, QueryRunner } from 'typeorm';
import documents from './content/legal-documents-v1.json';

// Frozen publication snapshot. Never overwrite a document edited by an operator.
export class PublishLegalDocuments1791597600000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.startTransaction();
    try {
      for (const document of documents) {
        await runner.query(
          `INSERT INTO term (type, title, content, version)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE id = id`,
          [document.type, document.title, document.content, document.version],
        );
      }
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    }
  }

  down(): Promise<void> {
    throw new Error('Forward-only: preserve published legal documents.');
  }
}
