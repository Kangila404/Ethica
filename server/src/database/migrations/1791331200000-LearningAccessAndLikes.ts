import { MigrationInterface, QueryRunner } from 'typeorm';

export class LearningAccessAndLikes1791331200000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE IF NOT EXISTS learning_profile_category (
      philosopher_id BIGINT NOT NULL,
      category VARCHAR(20) NOT NULL,
      PRIMARY KEY (philosopher_id, category),
      CONSTRAINT FK_learning_category_profile FOREIGN KEY (philosopher_id) REFERENCES philosopher(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
    await runner.query(`CREATE TABLE IF NOT EXISTS post_like (
      post_id BIGINT NOT NULL,
      user_id BIGINT NOT NULL,
      PRIMARY KEY (post_id, user_id),
      KEY IDX_post_like_user (user_id),
      CONSTRAINT FK_post_like_post FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
      CONSTRAINT FK_post_like_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
    // Add editorial categories only; never change content IDs or answer composition.
    await runner.query(`INSERT IGNORE INTO learning_profile_category (philosopher_id, category)
      SELECT p.id, CASE WHEN p.name = '오디세우스' THEN 'mythology' ELSE 'philosophy' END FROM philosopher p
      WHERE NOT EXISTS (SELECT 1 FROM learning_profile_category c WHERE c.philosopher_id = p.id)`);
    await runner.query(`INSERT IGNORE INTO learning_profile_category (philosopher_id, category)
      SELECT id, 'literature' FROM philosopher WHERE name IN ('알베르 카뮈', '장폴 사르트르', '시몬 드 보부아르', '오디세우스')`);
  }
  down(): Promise<void> {
    throw new Error(
      'Forward-only: preserve profile categories and user likes.',
    );
  }
}
