import { MigrationInterface, QueryRunner } from 'typeorm';

export class MultiDevicePush1791266400000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE IF NOT EXISTS push_devices (
      installationId CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      userId BIGINT NOT NULL,
      platform VARCHAR(16) NOT NULL,
      token VARCHAR(2048) NOT NULL,
      tokenHash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      enabled TINYINT NOT NULL DEFAULT 0,
      updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (installationId), UNIQUE KEY UQ_push_token (tokenHash), KEY IDX_push_user (userId),
      CONSTRAINT FK_push_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
    await runner.query(`CREATE TABLE IF NOT EXISTS push_deliveries (
      cycleId BIGINT NOT NULL,
      tokenHash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      sentAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY (cycleId, tokenHash),
      CONSTRAINT FK_push_cycle FOREIGN KEY (cycleId) REFERENCES user_daily_question(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
    // Existing users.fcmToken and notificationEnabled remain untouched for old iOS.
  }
  down(): Promise<void> {
    throw new Error(
      'Forward-only: preserve device registrations and delivery history.',
    );
  }
}
