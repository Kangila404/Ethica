import { MigrationInterface, QueryRunner } from 'typeorm';

// Frozen schema snapshot for first installations. Never regenerate from live entities.
// Review columns are deliberately left to ContentReview so seeded onboarding is published.
export class Baseline1790720000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    const tables = (await runner.query(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name <> 'migrations'",
    )) as Array<{ name: string }>;
    if (tables.length) {
      const required = [
        'users',
        'user_summary',
        'auth_Identity',
        'auth_challenge',
        'refresh_tokens',
        'category',
        'philosopher',
        'post',
        'post_segment',
        'question',
        'answer',
        'followup_answer',
        'question_category',
        'user_answer',
        'user_followup_answer',
        'user_philosopher_count',
        'user_daily_question',
      ];
      const names = new Set(tables.map((table) => table.name));
      if (!required.every((name) => names.has(name))) {
        throw new Error(
          'Incomplete baseline schema; restore a reviewed backup before retrying',
        );
      }
      return; // Adopt an existing develop database without altering its data.
    }
    for (const sql of baselineSql) await runner.query(sql);
  }

  down(): Promise<void> {
    return Promise.reject(
      new Error('Forward-only baseline; restore a reviewed backup'),
    );
  }
}

const baselineSql = [
  "CREATE TABLE `auth_challenge` (`id` char(36) NOT NULL, `provider` enum ('kakao', 'google', 'apple') NOT NULL, `nonce` varchar(64) NOT NULL, `expiresAt` datetime NOT NULL, INDEX `IDX_141ca0cb26533064b5fdada444` (`expiresAt`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
  "CREATE TABLE `social_revocation_job` (`createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `id` bigint NOT NULL AUTO_INCREMENT, `userId` bigint NOT NULL, `encryptedCredential` text NULL, `status` varchar(16) NOT NULL DEFAULT 'pending', `attempts` int NOT NULL DEFAULT '0', `nextAttemptAt` bigint NOT NULL, `leaseToken` char(36) NULL, `lastErrorCode` varchar(50) NULL, INDEX `IDX_7445ba7725f58a8d12f6d14dbc` (`status`), UNIQUE INDEX `IDX_035e26f7c8568d6657324feb86` (`userId`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
  'CREATE TABLE `category` (`id` bigint NOT NULL AUTO_INCREMENT, `name` varchar(50) NOT NULL, `sortOrder` int NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB',
  'CREATE TABLE `refresh_tokens` (`id` bigint NOT NULL AUTO_INCREMENT, `userId` bigint NOT NULL, `tokenHash` char(64) NOT NULL, `expiredAt` datetime NOT NULL, INDEX `IDX_610102b60fea1455310ccd299d` (`userId`), UNIQUE INDEX `IDX_c25bc63d248ca90e8dcc1d92d0` (`tokenHash`), PRIMARY KEY (`id`)) ENGINE=InnoDB',
  "CREATE TABLE `auth_Identity` (`createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `id` bigint NOT NULL AUTO_INCREMENT, `userId` bigint NOT NULL, `authType` enum ('kakao', 'google', 'apple') NOT NULL, `providerUid` varchar(255) NOT NULL, `email` varchar(255) NULL, UNIQUE INDEX `IDX_66b485da8d587f341c6f9ad95d` (`authType`, `providerUid`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
  "CREATE TABLE `onboarding_session` (`userId` bigint NOT NULL, `questionIds` json NOT NULL, `completedCount` int NOT NULL DEFAULT '0', `draftAnswerId` bigint NULL, `resultRequested` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (`userId`)) ENGINE=InnoDB",
  "CREATE TABLE `user_daily_question` (`createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `id` bigint NOT NULL AUTO_INCREMENT, `userId` bigint NOT NULL, `questionId` bigint NULL, `openedAt` bigint NULL, `answerId` bigint NULL, `followupAnswerId` bigint NULL, `notificationStatus` varchar(16) NOT NULL DEFAULT 'pending', `notificationToken` char(36) NULL, `notificationAttemptAt` bigint NULL, `notificationAttempts` int NOT NULL DEFAULT '0', `serviceDate` date NOT NULL, `status` enum ('expired', 'preparing', 'pending', 'completed') NOT NULL DEFAULT 'pending', UNIQUE INDEX `IDX_b63fc094e01aca9e900160e1c7` (`userId`, `questionId`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
  'CREATE TABLE `philosopher` (`id` bigint NOT NULL AUTO_INCREMENT, `name` varchar(50) NOT NULL, `era` varchar(50) NOT NULL, `school` varchar(50) NOT NULL, `coreThought` text NOT NULL, `lifeRoots` text NOT NULL, `imageKey` varchar(255) NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB',
  'CREATE TABLE `post` (`id` bigint NOT NULL AUTO_INCREMENT, `philosopher_id` bigint NOT NULL, `title` text NOT NULL, `image_key` varchar(255) NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB',
  "CREATE TABLE `post_segment` (`id` bigint NOT NULL AUTO_INCREMENT, `post_id` bigint NOT NULL, `segment_type` enum ('text', 'image') NOT NULL, `body` text NULL, `image_key` varchar(255) NULL, `sort_order` int NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB",
  'CREATE TABLE `followup_answer` (`id` bigint NOT NULL AUTO_INCREMENT, `questionId` bigint NOT NULL, `body` varchar(255) NOT NULL, `explanation` text NULL, `question_id` bigint NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB',
  'CREATE TABLE `question_category` (`questionId` bigint NOT NULL, `categoryId` bigint NOT NULL, PRIMARY KEY (`questionId`, `categoryId`)) ENGINE=InnoDB',
  "CREATE TABLE `question` (`id` bigint NOT NULL AUTO_INCREMENT, `usage` enum ('onboarding', 'daily') NOT NULL, `type` enum ('single', 'twoStage') NOT NULL, `title` varchar(100) NOT NULL, `stage1Body` text NOT NULL, `followupBody` text NULL, `imageKey` varchar(255) NULL, `isActive` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (`id`)) ENGINE=InnoDB",
  'CREATE TABLE `answer` (`id` bigint NOT NULL AUTO_INCREMENT, `questionId` bigint NOT NULL, `philosopherId` bigint NOT NULL, `body` varchar(255) NOT NULL, `explanation` text NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB',
  "CREATE TABLE `user_philosopher_count` (`id` bigint NOT NULL AUTO_INCREMENT, `user_id` bigint NOT NULL, `philosopher_id` bigint NOT NULL, `count` int NOT NULL DEFAULT '0', UNIQUE INDEX `IDX_53ca40909580656c852c5ff10b` (`user_id`, `philosopher_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
  'CREATE TABLE `notice` (`createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `id` bigint NOT NULL AUTO_INCREMENT, `authorId` bigint NULL, `title` varchar(200) NOT NULL, `content` text NOT NULL, `isPublished` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (`id`)) ENGINE=InnoDB',
  "CREATE TABLE `inquiry` (`createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `id` bigint NOT NULL AUTO_INCREMENT, `userId` bigint NOT NULL, `title` varchar(200) NOT NULL, `content` text NOT NULL, `status` varchar(16) NOT NULL DEFAULT 'pending', `answerContent` text NULL, `answeredBy` bigint NULL, `answeredAt` datetime NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB",
  "CREATE TABLE `user_summary` (`createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `id` bigint NOT NULL AUTO_INCREMENT, `user_id` bigint NOT NULL, `nearest_philosopher_id` bigint NOT NULL, `overall_summaries` json NOT NULL, `contradictions` json NOT NULL, `accuracy` int NOT NULL, `status` varchar(16) NOT NULL DEFAULT 'pending', `sourceFingerprint` char(64) NULL, `generationToken` char(36) NULL, `generationStartedAt` datetime NULL, `generationDate` date NULL, `generationAttempts` int NOT NULL DEFAULT '0', UNIQUE INDEX `IDX_156cbb156209d1e7d6dfc3cd43` (`user_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
  'CREATE TABLE `term` (`createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `id` bigint NOT NULL AUTO_INCREMENT, `type` varchar(16) NOT NULL, `title` varchar(200) NOT NULL, `content` text NOT NULL, `version` varchar(50) NOT NULL, UNIQUE INDEX `IDX_19a144ebe2c3c451ea16ff1685` (`type`), PRIMARY KEY (`id`)) ENGINE=InnoDB',
  "CREATE TABLE `users` (`createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `id` bigint NOT NULL AUTO_INCREMENT, `userId` varchar(36) NOT NULL, `name` varchar(50) NOT NULL, `avatarId` varchar(24) NULL, `userRole` enum ('user', 'admin') NOT NULL DEFAULT 'user', `userStatus` enum ('active', 'suspended') NOT NULL DEFAULT 'active', `onboardingStatus` enum ('incomplete', 'complete') NOT NULL DEFAULT 'incomplete', `notificationEnabled` tinyint NOT NULL DEFAULT 1, `fcmToken` varchar(255) NULL, `interestCategoryId` bigint NULL, `dailyQuestionTime` time NULL, `timezone` varchar(50) NULL, `pendingDailyQuestionTime` time NULL, `pendingTimezone` varchar(50) NULL, `dailyScheduleEffectiveAt` bigint NULL, `nextDailyAt` bigint NULL, `lastLoginAt` datetime NULL, `deletedAt` datetime(6) NULL, UNIQUE INDEX `IDX_8bf09ba754322ab9c22a215c91` (`userId`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
  'CREATE TABLE `user_followup_answer` (`id` bigint NOT NULL AUTO_INCREMENT, `userId` bigint NOT NULL, `followupAnswerId` bigint NOT NULL, `isOnboarding` tinyint NOT NULL, `answeredAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB',
  'CREATE TABLE `user_answer` (`id` bigint NOT NULL AUTO_INCREMENT, `userId` bigint NOT NULL, `answerId` bigint NOT NULL, `isOnboarding` tinyint NOT NULL, `serviceDate` date NULL, `answeredAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB',
  'ALTER TABLE `post` ADD CONSTRAINT `FK_3249e438d25cc83f06fc65483bd` FOREIGN KEY (`philosopher_id`) REFERENCES `philosopher`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
  'ALTER TABLE `post_segment` ADD CONSTRAINT `FK_33197fb1ba0805dbf6a2c70031e` FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
  'ALTER TABLE `followup_answer` ADD CONSTRAINT `FK_04e9e884da820f3501f85c52d19` FOREIGN KEY (`question_id`) REFERENCES `question`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
  'ALTER TABLE `question_category` ADD CONSTRAINT `FK_4c80fea518f6a98339cc19db83f` FOREIGN KEY (`questionId`) REFERENCES `question`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
  'ALTER TABLE `answer` ADD CONSTRAINT `FK_a4013f10cd6924793fbd5f0d637` FOREIGN KEY (`questionId`) REFERENCES `question`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
];
