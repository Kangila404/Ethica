import { IllustrateLearningSlides1791007200000 } from '../src/database/migrations/1791007200000-IllustrateLearningSlides';
import { UniqueLearningSlideImages1791010800000 } from '../src/database/migrations/1791010800000-UniqueLearningSlideImages';
import { ExpandLearningLibrary1791025200000 } from '../src/database/migrations/1791025200000-ExpandLearningLibrary';
import { learningLibraryV5 } from '../src/database/migrations/content/learning-library-v5';
import { ConceptQuestions1791079200000 } from '../src/database/migrations/1791079200000-ConceptQuestions';
import { PublishCamusWorks1791097200000 } from '../src/database/migrations/1791097200000-PublishCamusWorks';
import { camusWorksV7 } from '../src/database/migrations/content/camus-works-v7';
import {
  camusImages,
  camusCredits,
} from '../src/database/migrations/content/camus-images-v7';
import {
  conceptCategoriesV2,
  conceptQuestionsV2,
} from '../src/database/migrations/content/concepts-v2';
import { PublishPhilosopherStories1791028800000 } from '../src/database/migrations/1791028800000-PublishPhilosopherStories';
import { learningStoriesV6 } from '../src/database/migrations/content/learning-stories-v6';
import {
  storyCredits,
  storyImages,
} from '../src/database/migrations/content/learning-stories-images-v6';
import {
  libraryCredits,
  libraryImages,
} from '../src/database/migrations/content/learning-library-images-v5';
import {
  uniqueSlideCredits,
  uniqueSlideImages,
} from '../src/database/migrations/content/learning-slides-v4';
import {
  slideCredits,
  slideImages,
} from '../src/database/migrations/content/learning-slides-v3';
import { ReplaceLearningPosts1791003600000 } from '../src/database/migrations/1791003600000-ReplaceLearningPosts';
import {
  postsV1,
  contentImage,
} from '../src/database/migrations/content/editorial-v1';
import {
  learningPostsV2,
  articleImage,
  articleCredits,
} from '../src/database/migrations/content/learning-posts-v2';
import { ThinkerProfiles1791000000000 } from '../src/database/migrations/1791000000000-ThinkerProfiles';
import {
  thinkerProfilesV1,
  portraitAttribution,
} from '../src/database/migrations/content/thinker-profiles-v1';
import { ContentReview1790816400000 } from '../src/database/migrations/1790816400000-ContentReview';
import { ContentStatus } from '../src/common/content-status';
import { Post as LearningPost } from '../src/philosopher/domain/model/post.entity';
import { PostSegment } from '../src/philosopher/domain/model/post-segment.entity';
import { AnalysisQuota1790812800000 } from '../src/database/migrations/1790812800000-AnalysisQuota';
import { randomUUID } from 'node:crypto';
import { OnboardingContent1790740800000 } from '../src/database/migrations/1790740800000-OnboardingContent';
import {
  onboardingV1,
  philosophersV1,
} from '../src/database/migrations/content/onboarding-v1';
import { UserRole } from '../src/user/domain/enum/user-role.enum';
import { UserStatus } from '../src/user/domain/enum/user-status.enum';
import { AuthType } from '../src/auth/domain/enums/auth-Type.enum';
import { AuthIdentity } from '../src/auth/domain/model/auth-identity.entity';
import { AuthChallenge } from '../src/auth/domain/model/auth-challenge.entity';
import { RefreshToken } from '../src/auth/domain/model/refresh-token.entity';
import { SOCIAL_TOKEN_VERIFIER } from '../src/auth/domain/client/social-token-verifier';
import { REVOCATION_CLIENT } from '../src/account/domain/revocation-client';
import {
  ACCOUNT_STORE,
  type AccountStore,
} from '../src/account/domain/account-store';
import {
  CREDENTIAL_CIPHER,
  type CredentialCipher,
} from '../src/account/domain/credential-cipher';
import { AccountSchedulerService } from '../src/account/application/account-scheduler.service';
import { RevocationJob } from '../src/account/domain/model/revocation-job.entity';
import { Inquiry } from '../src/support/domain/model/inquiry.entity';
import { Notice } from '../src/support/domain/model/notice.entity';
import { AdminSupportAccount1790733600000 } from '../src/database/migrations/1790733600000-AdminSupportAccount';
import {
  USER_PHILOSOPHER_COUNT_REPOSITORY,
  type UserPhilosopherCountRepository,
} from '../src/philosopher/domain/repository/user-philosopher-count.repository';
import { DailyQuestionStatus } from '../src/daily/domain/enums/daily-question-status.enum';
import { DailyService } from '../src/daily/application/daily.service';
import { dailyBoundary, dailyDate } from '../src/common/daily-clock';
import {
  USER_DAILY_QUESTION_REPOSITORY,
  type UserDailyQuestionRepository,
} from '../src/daily/domain/repository/user-daily-question.repository';
import { UserDailyQuestion } from '../src/daily/domain/model/user_daily_question.entity';
import { OnboardingStatus } from '../src/user/domain/enum/OnboardingStatus.enum';
import { DailyCycles1790730000000 } from '../src/database/migrations/1790730000000-DailyCycles';
import {
  USER_SUMMARY_REPOSITORY,
  type UserSummaryRepository,
} from '../src/user/domain/repository/user-summary.repository';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource, TableIndex, TableColumn } from 'typeorm';
import { initializeTransactionalContext } from 'typeorm-transactional';
import request from 'supertest';
import type { Server } from 'node:http';
import { AppModule } from '../src/app.module';
import { ANALYSIS_AI_CLIENT } from '../src/analysis/domain/client/analysis-ai.client';
import { NotificationService } from '../src/daily/application/notification.service';
import { DailySchedulerService } from '../src/daily/application/daily-scheduler.service';
import { User } from '../src/user/domain/model/user.entity';
import { UserAnswer } from '../src/user-answer/domain/model/user-answer.entity';
import { UserFollowupAnswer } from '../src/user-answer/domain/model/user-followup-answer.entity';
import { UserPhilosopherCount } from '../src/philosopher/domain/model/user-philosopher-count.entity';
import { Philosopher } from '../src/philosopher/domain/model/philosopher.entity';
import { Category } from '../src/category/domain/model/category.entity';
import { Question } from '../src/question/domain/model/question.entity';
import { Answer } from '../src/question/domain/model/answer.entity';
import { FollowupAnswer } from '../src/question/domain/model/followup-answer.entity';
import { QuestionCategory } from '../src/question/domain/model/question-category.entity';
import { QuestionType } from '../src/question/domain/enum/question-type.enum';
import { QuestionUsage } from '../src/question/domain/enum/question-usage.enum';
import { OnboardingSession } from '../src/onboarding/domain/model/onboarding-session.entity';
import { UserSummary } from '../src/user/domain/model/user-summary.entity';
import { OnboardingAnalysis1790726400000 } from '../src/database/migrations/1790726400000-OnboardingAnalysis';
import { USER_FOLLOWUP_ANSWER_REPOSITORY } from '../src/user-answer/domain/repository/user-followup-answer.repository';
import { UserFollowupAnswerRepositoryImpl } from '../src/user-answer/infrastructure/persistence/repository/user-followup-answer.repository.impl';

// Run only against a newly created disposable MySQL database. No real AI or push calls.
describe('Server workflows with MySQL', () => {
  let app: INestApplication;
  let db: DataSource;
  let category: Category;
  let questions: Question[];
  let jwt: JwtService;
  const socialVerifier = { verify: jest.fn(), assertConfigured: jest.fn() };
  const revoker = { prepare: jest.fn(), revoke: jest.fn() };
  const ai = { analyze: jest.fn() };
  beforeAll(async () => {
    const database = process.env.ETHICA_TEST_DB;
    if (!database || !/^ethica_verify_[a-z0-9_]+$/.test(database))
      throw new Error(
        'Set ETHICA_TEST_DB to a new disposable ethica_verify_* database',
      );
    Object.assign(process.env, {
      DB_DATABASE: database,
      DB_HOST: '127.0.0.1',
      DB_PORT: '3308',
      DB_USERNAME: 'ethica',
      DB_PASSWORD: 'ethica',
      DB_SYNCHRONIZE: 'false',
      SOCIAL_TOKEN_ENCRYPTION_KEY: 'a'.repeat(64),
      JWT_SECRET: 'integration-only-secret-not-a-real-credential',
    });
    initializeTransactionalContext();
    const baseline = new DataSource({
      type: 'mysql',
      host: '127.0.0.1',
      port: 3308,
      username: 'ethica',
      password: 'ethica',
      database,
      entities: [__dirname + '/../src/**/*.entity.ts'],
      synchronize: false,
    });
    await baseline.initialize();
    try {
      const tables: unknown[] = await baseline.query('SHOW TABLES');
      if (tables.length)
        throw new Error(
          'Integration database must be empty; refusing to alter existing data',
        );
      await baseline.synchronize();
      const runner = baseline.createQueryRunner();
      await runner.dropTable('onboarding_session');
      for (const column of [
        'status',
        'sourceFingerprint',
        'generationToken',
        'generationStartedAt',
      ])
        await runner.dropColumn('user_summary', column);
      await runner.dropColumn('user_summary', 'generationDate');
      await runner.dropColumn('user_summary', 'generationAttempts');
      await new AnalysisQuota1790812800000().up(runner);
      await new AnalysisQuota1790812800000().up(runner);
      const migration = new OnboardingAnalysis1790726400000();
      await migration.up(runner);
      await migration.up(runner);
      // Exercise additive daily migration against the prior schema, twice.
      for (const column of [
        'nextDailyAt',
        'pendingDailyQuestionTime',
        'pendingTimezone',
        'dailyScheduleEffectiveAt',
      ])
        await runner.dropColumn('users', column);
      await runner.dropColumn('user_answer', 'serviceDate');
      for (const column of [
        'openedAt',
        'answerId',
        'followupAnswerId',
        'notificationStatus',
        'notificationToken',
        'notificationAttemptAt',
        'notificationAttempts',
      ])
        await runner.dropColumn('user_daily_question', column);
      await runner.changeColumn(
        'user_daily_question',
        'questionId',
        new TableColumn({ name: 'questionId', type: 'bigint' }),
      );
      await runner.changeColumn(
        'user_daily_question',
        'status',
        new TableColumn({
          name: 'status',
          type: 'enum',
          enum: ['pending', 'completed'],
          default: "'pending'",
        }),
      );
      await runner.createIndex(
        'user_daily_question',
        new TableIndex({
          name: 'legacy_user_service_date',
          columnNames: ['userId', 'serviceDate'],
          isUnique: true,
        }),
      );
      const dailyMigration = new DailyCycles1790730000000();
      await dailyMigration.up(runner);
      await dailyMigration.up(runner);
      for (const table of [
        'inquiry',
        'notice',
        'term',
        'social_revocation_job',
      ])
        await runner.dropTable(table);
      const operationsMigration = new AdminSupportAccount1790733600000();
      await operationsMigration.up(runner);
      await operationsMigration.up(runner);
      await runner.release();
    } finally {
      await baseline.destroy();
    }
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AccountSchedulerService)
      .useValue({})
      .overrideProvider(SOCIAL_TOKEN_VERIFIER)
      .useValue(socialVerifier)
      .overrideProvider(REVOCATION_CLIENT)
      .useValue(revoker)
      .overrideProvider(ANALYSIS_AI_CLIENT)
      .useValue(ai)
      .overrideProvider(NotificationService)
      .useValue({ sendDailyQuestionAlert: jest.fn() })
      .overrideProvider(DailySchedulerService)
      .useValue({})
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    db = app.get(DataSource);
    jwt = app.get(JwtService);
    category = await db
      .getRepository(Category)
      .save({ name: '통합 테스트', sortOrder: 1 });
    const philosopher = await db.getRepository(Philosopher).save({
      name: '테스트 사상가',
      era: '테스트',
      school: '테스트',
      coreThought: '테스트',
      lifeRoots: '테스트',
    });
    questions = [];
    for (let i = 0; i < 5; i++) {
      const q = await db.getRepository(Question).save({
        usage: QuestionUsage.ONBOARDING,
        type: i === 0 ? QuestionType.TWO_STAGE : QuestionType.SINGLE,
        title: '테스트 ' + i,
        stage1Body: '첫 질문',
        followupBody: i === 0 ? '후속 질문' : null,
        isActive: true,
        status: ContentStatus.PUBLISHED,
      });
      await db
        .getRepository(QuestionCategory)
        .save({ questionId: q.id, categoryId: category.id });
      await db.getRepository(Answer).save([
        {
          questionId: q.id,
          philosopherId: philosopher.id,
          body: 'A',
          explanation: '해설',
        },
        {
          questionId: q.id,
          philosopherId: philosopher.id,
          body: 'B',
          explanation: '해설',
        },
      ]);
      if (i === 0)
        await db.getRepository(FollowupAnswer).save([
          { questionId: q.id, question: q, body: '예', explanation: '해설' },
          {
            questionId: q.id,
            question: q,
            body: '아니오',
            explanation: '해설',
          },
        ]);
      questions.push(
        await db.getRepository(Question).findOneOrFail({
          where: { id: q.id },
          relations: { answers: true, followupAnswers: true },
        }),
      );
    }
  });
  afterAll(async () => {
    if (app) await app.close();
  });
  it('migrates production onboarding content atomically, preserves edits, and serves all three five-question flows', async () => {
    const existingThinker = await db.getRepository(Philosopher).save({
      ...philosophersV1.kant,
      coreThought: 'Existing editorial text to preserve',
    });
    const existingCategory = await db
      .getRepository(Category)
      .save({ name: onboardingV1[0].name, sortOrder: 42 });
    const migrationDb = new DataSource({
      type: 'mysql',
      host: '127.0.0.1',
      port: 3308,
      username: 'ethica',
      password: 'ethica',
      database: process.env.ETHICA_TEST_DB,
      migrations: [OnboardingContent1790740800000],
      migrationsTransactionMode: 'none',
      synchronize: false,
      logging: false,
    });
    await migrationDb.initialize();
    await migrationDb.createQueryRunner().dropColumn('question', 'status');
    await migrationDb.createQueryRunner().dropColumn('post', 'status');
    try {
      const before = {
        questions: await db.getRepository(Question).count(),
        categories: await db.getRepository(Category).count(),
        philosophers: await db.getRepository(Philosopher).count(),
        answers: await db.getRepository(Answer).count(),
      };
      const runner = migrationDb.createQueryRunner();
      const originalQuery = runner.query.bind(runner) as (
        sql: string,
        parameters?: unknown[],
        structured?: boolean,
      ) => Promise<unknown>;
      jest
        .spyOn(runner, 'query')
        .mockImplementation(
          (sql: string, parameters?: unknown[], structured?: boolean) => {
            if (sql.startsWith('INSERT INTO answer'))
              return Promise.reject(
                new Error('injected content insert failure'),
              );
            return originalQuery(sql, parameters, structured);
          },
        );
      const createRunner = jest
        .spyOn(migrationDb, 'createQueryRunner')
        .mockReturnValueOnce(runner);
      await expect(migrationDb.runMigrations()).rejects.toThrow(
        'injected content insert failure',
      );
      createRunner.mockRestore();
      expect(await db.getRepository(Question).count()).toBe(before.questions);
      expect(await db.getRepository(Category).count()).toBe(before.categories);
      expect(await db.getRepository(Philosopher).count()).toBe(
        before.philosophers,
      );
      expect(await db.getRepository(Answer).count()).toBe(before.answers);

      expect(await migrationDb.runMigrations()).toHaveLength(1);
      await new ContentReview1790816400000().up(
        migrationDb.createQueryRunner(),
      );
      await new ContentReview1790816400000().up(
        migrationDb.createQueryRunner(),
      );
      expect(await migrationDb.runMigrations()).toHaveLength(0);
      expect(await db.getRepository(Question).count()).toBe(
        before.questions + 15,
      );
      expect(await db.getRepository(Answer).count()).toBe(before.answers + 30);
      expect(
        (
          await db
            .getRepository(Philosopher)
            .findOneByOrFail({ id: existingThinker.id })
        ).coreThought,
      ).toBe('Existing editorial text to preserve');
      expect(
        (
          await db
            .getRepository(Category)
            .findOneByOrFail({ id: existingCategory.id })
        ).sortOrder,
      ).toBe(42);
      for (const content of onboardingV1) {
        const c = await db
          .getRepository(Category)
          .findOneByOrFail({ name: content.name });
        const { user, token } = await newUser();
        await post('onboarding/question', token, { categoryId: c.id }).expect(
          201,
        );
        const response = await request(app.getHttpServer() as Server)
          .get('/api/onboarding/questions')
          .set('Authorization', 'Bearer ' + token)
          .expect(200);
        const items = (
          response.body as {
            items: Array<{
              questionId: string;
              answers: Array<{ answerId: string }>;
              followup: { answers: Array<{ followupAnswerId: string }> } | null;
            }>;
          }
        ).items;
        expect(items).toHaveLength(5);
        expect(items.filter((q) => q.followup)).toHaveLength(1);
        for (const q of items) {
          expect(q.answers).toHaveLength(2);
          if (q.followup) {
            expect(q.followup.answers).toHaveLength(2);
            await post('onboarding/answers/draft', token, {
              questionId: q.questionId,
              answerId: q.answers[0].answerId,
            }).expect(201);
          }
          await post('onboarding/answers', token, {
            questionId: q.questionId,
            answerId: q.answers[0].answerId,
            ...(q.followup
              ? { followupAnswerId: q.followup.answers[0].followupAnswerId }
              : {}),
          }).expect(201);
        }
        const result = await post('onboarding/result', token).expect(201);
        expect(result.body).toMatchObject({
          analysis: { answeredCount: 5 },
          summary: { status: 'pending' },
        });
        const counts = await db
          .getRepository(UserPhilosopherCount)
          .findBy({ userId: user.id });
        expect(counts.reduce((total, row) => total + row.count, 0)).toBe(5);
        expect(
          await db
            .getRepository(UserFollowupAnswer)
            .countBy({ userId: user.id }),
        ).toBe(1);
      }
      const firstQuestion = await db
        .getRepository(Question)
        .findOneByOrFail({ title: onboardingV1[0].questions[0].title });
      await db.getRepository(Question).update(firstQuestion.id, {
        stage1Body: 'Administrator revised content',
        isActive: false,
      });
      expect(await migrationDb.runMigrations()).toHaveLength(0);
      expect(
        await db
          .getRepository(Question)
          .findOneByOrFail({ id: firstQuestion.id }),
      ).toMatchObject({
        stage1Body: 'Administrator revised content',
        isActive: false,
      });
    } finally {
      await migrationDb.destroy();
    }
  });
  async function newUser(consent = true) {
    const entity = User.create('테스트');
    if (consent) {
      entity.aiConsentVersion = '2026-10-02';
      entity.aiConsentUpdatedAt = new Date();
    }
    const user = await db.getRepository(User).save(entity);
    return { user, token: jwt.sign({ sub: user.userId, type: 'access' }) };
  }
  function post(path: string, token: string, body: object = {}) {
    return request(app.getHttpServer() as Server)
      .post('/api/' + path)
      .set('Authorization', 'Bearer ' + token)
      .send(body);
  }
  function answer(q: Question) {
    return {
      questionId: q.id,
      answerId: q.answers[0].id,
      ...(q.type === QuestionType.TWO_STAGE
        ? { followupAnswerId: q.followupAnswers[0].id }
        : {}),
    };
  }
  it('persists bundled avatars per account and validates nickname and avatar writes', async () => {
    const owner = await newUser();
    const other = await newUser();
    const http = app.getHttpServer() as Server;
    await request(http)
      .patch('/api/users/me/avatar')
      .send({ avatarId: 'moon' })
      .expect(401);
    await request(http)
      .patch('/api/users/me/avatar')
      .set('Authorization', 'Bearer ' + owner.token)
      .send({ avatarId: 'moon', userId: other.user.userId })
      .expect(200);
    const own = await request(http)
      .get('/api/users/me')
      .set('Authorization', 'Bearer ' + owner.token)
      .expect(200);
    expect((own.body as { avatarId: string | null }).avatarId).toBe('moon');
    const untouched = await request(http)
      .get('/api/users/me')
      .set('Authorization', 'Bearer ' + other.token)
      .expect(200);
    expect((untouched.body as { avatarId: string | null }).avatarId).toBeNull();
    for (const body of [{}, { avatarId: 'not-an-avatar' }]) {
      await request(http)
        .patch('/api/users/me/avatar')
        .set('Authorization', 'Bearer ' + owner.token)
        .send(body)
        .expect(400);
    }
    await request(http)
      .patch('/api/users/me/avatar')
      .set('Authorization', 'Bearer ' + owner.token)
      .send({ avatarId: null })
      .expect(200);
    expect(
      (
        (
          await request(http)
            .get('/api/users/me')
            .set('Authorization', 'Bearer ' + owner.token)
        ).body as { avatarId: string | null }
      ).avatarId,
    ).toBeNull();
    await request(http)
      .patch('/api/users/me')
      .set('Authorization', 'Bearer ' + owner.token)
      .send({ name: '가'.repeat(50) })
      .expect(200);
    expect(
      (
        (
          await request(http)
            .get('/api/users/me')
            .set('Authorization', 'Bearer ' + owner.token)
        ).body as { name: string }
      ).name,
    ).toHaveLength(50);
    await request(http)
      .patch('/api/users/me')
      .set('Authorization', 'Bearer ' + owner.token)
      .send({ name: '   ' })
      .expect(400);
    await request(http)
      .patch('/api/users/me')
      .set('Authorization', 'Bearer ' + owner.token)
      .send({ name: '가'.repeat(51) })
      .expect(400);
  });
  it('runs the full HTTP flow, serializes simultaneous submissions, and persists summary retries', async () => {
    const { user, token } = await newUser(false);
    await request(app.getHttpServer() as Server)
      .get('/api/categories')
      .expect(401);
    await request(app.getHttpServer() as Server)
      .get('/api/categories')
      .set('Authorization', 'Bearer ' + token)
      .expect(200);
    await post('onboarding/question', token, {
      categoryId: category.id,
    }).expect(201);
    await post('onboarding/result', token).expect(409);
    await post('onboarding/answers/draft', token, {
      questionId: questions[0].id,
      answerId: questions[0].answers[0].id,
    }).expect(201);
    const responses = await Promise.all([
      post('onboarding/answers', token, answer(questions[0])),
      post('onboarding/answers', token, answer(questions[0])),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(
      await db.getRepository(UserAnswer).countBy({ userId: user.id }),
    ).toBe(1);
    expect(
      await db.getRepository(UserFollowupAnswer).countBy({ userId: user.id }),
    ).toBe(1);
    expect(
      (
        await db
          .getRepository(UserPhilosopherCount)
          .findOneByOrFail({ userId: user.id })
      ).count,
    ).toBe(1);
    for (const q of questions.slice(1))
      await post('onboarding/answers', token, answer(q)).expect(201);
    const result = await post('onboarding/result', token).expect(201);
    expect(result.body).toMatchObject({
      analysis: { accuracy: 16, answeredCount: 5 },
      summary: { status: 'pending' },
    });
    expect(ai.analyze).not.toHaveBeenCalled();
    await post('analysis/contradictions', token).expect(403);
    expect(ai.analyze).not.toHaveBeenCalled();
    await request(app.getHttpServer() as Server)
      .patch('/api/users/me/ai-consent')
      .set('Authorization', 'Bearer ' + token)
      .send({ enabled: true, version: '2026-10-02' })
      .expect(200);
    ai.analyze.mockRejectedValueOnce(new Error('simulated upstream timeout'));
    expect(
      (await post('analysis/contradictions', token).expect(200)).body,
    ).toMatchObject({ status: 'failed', canRetry: true });
    const record = await db
      .getRepository(UserAnswer)
      .findOneByOrFail({ userId: user.id });
    const insight = {
      title: '근거',
      summary: '테스트 해설',
      userAnswerIds: [record.id],
    };
    ai.analyze.mockResolvedValue({
      overallSummaries: [insight],
      contradictions: [insight],
    });
    expect(
      (await post('analysis/contradictions', token).expect(200)).body,
    ).toMatchObject({ status: 'ready' });
    await post('analysis/contradictions', token).expect(200);
    expect(ai.analyze).toHaveBeenCalledTimes(2);
    expect(
      (
        await post('onboarding/daily-time', token, {
          timezone: 'Asia/Seoul',
        }).expect(201)
      ).body,
    ).toMatchObject({
      onboardingStatus: 'complete',
      dailyQuestionTime: '08:00',
    });
    await post('onboarding/daily-time', token, {
      timezone: 'UTC',
      dailyQuestionTime: '09:00',
    }).expect(201);
    expect(
      (await db.getRepository(User).findOneByOrFail({ id: user.id }))
        .dailyQuestionTime,
    ).toBe('08:00:00');
  });
  it('rolls back the first answer and count when the followup insert fails', async () => {
    const { user, token } = await newUser();
    await post('onboarding/question', token, {
      categoryId: category.id,
    }).expect(201);
    const repository = app.get<UserFollowupAnswerRepositoryImpl>(
      USER_FOLLOWUP_ANSWER_REPOSITORY,
    );
    const failure = jest
      .spyOn(repository, 'save')
      .mockRejectedValueOnce(new Error('simulated storage failure'));
    try {
      await post('onboarding/answers', token, answer(questions[0])).expect(500);
    } finally {
      failure.mockRestore();
    }
    expect(
      await db.getRepository(UserAnswer).countBy({ userId: user.id }),
    ).toBe(0);
    expect(
      await db.getRepository(UserPhilosopherCount).countBy({ userId: user.id }),
    ).toBe(0);
    expect(
      (
        await db
          .getRepository(OnboardingSession)
          .findOneByOrFail({ userId: user.id })
      ).completedCount,
    ).toBe(0);
    await post('onboarding/answers', token, answer(questions[0])).expect(201);
  });
  it('reclaims expired generation leases and rejects the old worker result', async () => {
    const { user, token } = await newUser();
    await post('onboarding/question', token, {
      categoryId: category.id,
    }).expect(201);
    for (const q of questions)
      await post('onboarding/answers', token, answer(q)).expect(201);
    await post('onboarding/result', token).expect(201);
    await db.getRepository(UserSummary).update(
      { userId: user.id },
      {
        status: 'processing',
        generationToken: 'old',
        generationStartedAt: new Date(Date.now() - 120000),
      },
    );
    const record = await db
      .getRepository(UserAnswer)
      .findOneByOrFail({ userId: user.id });
    ai.analyze.mockResolvedValue({
      overallSummaries: [
        { title: '재시도', summary: '정상', userAnswerIds: [record.id] },
      ],
      contradictions: [],
    });
    expect(
      (await post('analysis/contradictions', token).expect(200)).body,
    ).toMatchObject({ status: 'ready' });
  });
  it('allows only one AI request across concurrent HTTP generation calls', async () => {
    const { user, token } = await newUser();
    await post('onboarding/question', token, {
      categoryId: category.id,
    }).expect(201);
    for (const q of questions)
      await post('onboarding/answers', token, answer(q)).expect(201);
    await post('onboarding/result', token).expect(201);
    const record = await db
      .getRepository(UserAnswer)
      .findOneByOrFail({ userId: user.id });
    const insight = {
      title: '동시성',
      summary: '정상',
      userAnswerIds: [record.id],
    };
    let release!: () => void;
    const calls = ai.analyze.mock.calls.length;
    ai.analyze.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () =>
            resolve({ overallSummaries: [insight], contradictions: [] });
        }),
    );
    const first = post('analysis/contradictions', token).then(
      (response) => response,
    );
    try {
      for (let i = 0; i < 100 && !release; i++)
        await new Promise((resolve) => setTimeout(resolve, 10));
      expect(release).toBeDefined();
      expect(
        (await post('analysis/contradictions', token).expect(200)).body,
      ).toMatchObject({ status: 'processing' });
    } finally {
      if (release) release();
    }
    expect((await first).body).toMatchObject({ status: 'ready' });
    expect(ai.analyze.mock.calls.length - calls).toBe(1);
    const summary = await db
      .getRepository(UserSummary)
      .findOneByOrFail({ userId: user.id });
    const repository = app.get<UserSummaryRepository>(USER_SUMMARY_REPOSITORY);
    expect(
      await repository.finish(
        user.id,
        summary.sourceFingerprint!,
        'stale-worker',
        null,
      ),
    ).toBe(false);
    expect(
      (await db.getRepository(UserSummary).findOneByOrFail({ userId: user.id }))
        .status,
    ).toBe('ready');
  });
  it('persists quota across snapshots, failures and workers; cached reads are free and midnight resets it', async () => {
    const { user, token } = await newUser();
    await post('onboarding/question', token, {
      categoryId: category.id,
    }).expect(201);
    for (const q of questions)
      await post('onboarding/answers', token, answer(q)).expect(201);
    await post('onboarding/result', token).expect(201);
    const repo = app.get<UserSummaryRepository>(USER_SUMMARY_REPOSITORY);
    const now = new Date('2026-10-01T14:59:00Z');
    let snapshot = await repo.ensureSnapshot(
      user.id,
      questions[0].answers[0].philosopherId,
      'a'.repeat(64),
      16,
    );
    const claims = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        repo.claim(user.id, snapshot.sourceFingerprint!, `token-${i}`, now),
      ),
    );
    expect(claims.filter(Boolean)).toHaveLength(1);
    snapshot = (await repo.findByUserId(user.id))!;
    expect(snapshot.generationAttempts).toBe(1);
    await repo.finish(
      user.id,
      snapshot.sourceFingerprint!,
      snapshot.generationToken!,
      null,
    );
    for (let i = 2; i <= 3; i++) {
      snapshot = await repo.ensureSnapshot(
        user.id,
        snapshot.nearestPhilosopherId,
        String(i).repeat(64),
        16,
      );
      expect(
        await repo.claim(
          user.id,
          snapshot.sourceFingerprint!,
          `next-${i}`,
          now,
        ),
      ).toBe(true);
      await repo.finish(
        user.id,
        snapshot.sourceFingerprint!,
        `next-${i}`,
        null,
      );
    }
    await expect(
      repo.claim(user.id, snapshot.sourceFingerprint!, 'fourth', now),
    ).rejects.toMatchObject({ status: 429 });
    expect((await repo.findByUserId(user.id))?.generationAttempts).toBe(3);
    await db
      .getRepository(UserSummary)
      .update({ userId: user.id }, { status: 'ready' });
    expect(
      await repo.claim(user.id, snapshot.sourceFingerprint!, 'cached', now),
    ).toBe(false);
    snapshot = await repo.ensureSnapshot(
      user.id,
      snapshot.nearestPhilosopherId,
      'b'.repeat(64),
      16,
    );
    await expect(
      repo.claim(user.id, snapshot.sourceFingerprint!, 'blocked', now),
    ).rejects.toMatchObject({ status: 429 });
    expect(
      await repo.claim(
        user.id,
        snapshot.sourceFingerprint!,
        'tomorrow',
        new Date('2026-10-01T15:00:00Z'),
      ),
    ).toBe(true);
    expect(await repo.findByUserId(user.id)).toMatchObject({
      generationDate: '2026-10-02',
      generationAttempts: 1,
    });
    // HTTP denial cannot reach the external AI client, even after a fresh snapshot.
    const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    await db
      .getRepository(UserSummary)
      .update(
        { userId: user.id },
        { status: 'failed', generationDate: today, generationAttempts: 3 },
      );
    const calls = ai.analyze.mock.calls.length;
    await post('analysis/contradictions', token).expect(429);
    const state = await request(app.getHttpServer() as Server)
      .get('/api/analysis/contradictions')
      .set('Authorization', 'Bearer ' + token)
      .expect(200);
    expect(state.body).toMatchObject({
      canRetry: false,
      quota: { limit: 3, remaining: 0 },
    });
    expect(ai.analyze.mock.calls.length).toBe(calls);
  });
  it('atomically completes onboarding with one immediate question under concurrent retries', async () => {
    const { user, token } = await newUser();
    const question = await dailyQuestion(QuestionType.SINGLE);
    await db.getRepository(OnboardingSession).save({
      userId: user.id,
      questionIds: questions.map((q) => q.id),
      completedCount: 5,
      resultRequested: true,
    });
    const before = new Date();
    await Promise.all(
      [1, 2].map(() =>
        post('onboarding/daily-time', token, {
          timezone: 'Asia/Seoul',
          dailyQuestionTime: '21:00',
        }).expect(201),
      ),
    );
    const cycles = await db
      .getRepository(UserDailyQuestion)
      .findBy({ userId: user.id });
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toMatchObject({
      questionId: question.id,
      status: 'pending',
      serviceDate: dailyDate(before, 'Asia/Seoul'),
      notificationStatus: 'skipped',
    });
    expect(cycles[0].openedAt!.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
    const saved = await db.getRepository(User).findOneByOrFail({ id: user.id });
    expect(saved.nextDailyAt).toEqual(
      dailyBoundary(before, '21:00', 'Asia/Seoul', true),
    );
    expect((await today(token).expect(200)).body).toMatchObject({
      userDailyQuestion: 'pending',
      questionId: question.id,
    });
    await db.getRepository(Question).update(question.id, {
      isActive: false,
      status: ContentStatus.HELD,
    });
  });
  it('rolls back onboarding completion and the first question if its storage fails', async () => {
    const { user, token } = await newUser();
    await db.getRepository(OnboardingSession).save({
      userId: user.id,
      questionIds: questions.map((q) => q.id),
      completedCount: 5,
      resultRequested: true,
    });
    const repository = app.get<UserDailyQuestionRepository>(
      USER_DAILY_QUESTION_REPOSITORY,
    );
    const save = repository.save.bind(
      repository,
    ) as UserDailyQuestionRepository['save'];
    const failure = jest
      .spyOn(repository, 'save')
      .mockImplementationOnce(async (cycle) => {
        await save(cycle);
        throw new Error('simulated failure after inserting the first question');
      });
    try {
      await post('onboarding/daily-time', token, {
        timezone: 'Asia/Seoul',
      }).expect(500);
    } finally {
      failure.mockRestore();
    }
    expect(
      await db.getRepository(User).findOneByOrFail({ id: user.id }),
    ).toMatchObject({ onboardingStatus: 'incomplete' });
    expect(
      await db.getRepository(UserDailyQuestion).countBy({ userId: user.id }),
    ).toBe(0);
    await post('onboarding/daily-time', token, {
      timezone: 'Asia/Seoul',
    }).expect(201);
    expect(
      await db.getRepository(UserDailyQuestion).countBy({ userId: user.id }),
    ).toBe(1);
  });
  async function dailyUser() {
    const { user, token } = await newUser();
    await db.getRepository(User).update(user.id, {
      onboardingStatus: OnboardingStatus.COMPLETE,
      dailyQuestionTime: '08:00',
      timezone: 'Asia/Seoul',
      nextDailyAt: new Date(Date.now() - 1000),
      fcmToken: 'test-token',
    });
    return { user, token };
  }
  async function dailyQuestion(type = QuestionType.TWO_STAGE) {
    const philosopher = await db
      .getRepository(Philosopher)
      .findOneByOrFail({ name: '테스트 사상가' });
    const q = await db.getRepository(Question).save({
      usage: QuestionUsage.DAILY,
      type,
      title: '일일',
      stage1Body: '질문',
      followupBody: '후속',
      isActive: true,
      status: ContentStatus.PUBLISHED,
    });
    await db.getRepository(Answer).save(
      ['A', 'B'].map((body) => ({
        questionId: q.id,
        philosopherId: philosopher.id,
        body,
        explanation: '설명',
      })),
    );
    await db.getRepository(FollowupAnswer).save(
      ['C', 'D'].map((body) => ({
        questionId: q.id,
        question: q,
        body,
        explanation: '후속 설명',
      })),
    );
    return db.getRepository(Question).findOneOrFail({
      where: { id: q.id },
      relations: { answers: true, followupAnswers: true },
    });
  }
  function payload(response: { body: unknown }): Record<string, string> {
    return response.body as Record<string, string>;
  }
  function today(token: string) {
    return request(app.getHttpServer() as Server)
      .get('/api/daily/today')
      .set('Authorization', 'Bearer ' + token);
  }
  it('serializes daily assignment and answers; rejects foreign choices and immutable changes', async () => {
    const q = await dailyQuestion();
    const { user, token } = await dailyUser();
    const results = await Promise.all([today(token), today(token)]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(payload(results[0]).questionId).toBe(q.id);
    expect(
      await db.getRepository(UserDailyQuestion).countBy({ userId: user.id }),
    ).toBe(1);
    await post('daily/answers/stage2', token, {
      questionId: q.id,
      followupAnswerId: q.followupAnswers[0].id,
    }).expect(403);
    await post('daily/answers/stage1', token, {
      questionId: q.id,
      answerId: questions[0].answers[0].id,
    }).expect(403);
    const submissions = await Promise.all([
      post('daily/answers/stage1', token, answer(q)),
      post('daily/answers/stage1', token, answer(q)),
    ]);
    expect(submissions.map((r) => r.status)).toEqual([201, 201]);
    expect(payload(submissions[0]).requiresApp).toBe(true);
    expect(payload(submissions[0]).aggregated).toBe(false);
    expect((await today(token)).body).toMatchObject({
      userDailyQuestion: 'pending',
      requiresFollowup: true,
    });
    expect(
      await db.getRepository(UserAnswer).countBy({ userId: user.id }),
    ).toBe(0);
    await post('daily/answers/stage1', token, {
      questionId: q.id,
      answerId: q.answers[1].id,
    }).expect(409);
    const followup = {
      questionId: q.id,
      followupAnswerId: q.followupAnswers[0].id,
    };
    await Promise.all([
      post('daily/answers/stage2', token, followup).expect(201),
      post('daily/answers/stage2', token, followup).expect(201),
    ]);
    expect(
      await db.getRepository(UserFollowupAnswer).countBy({ userId: user.id }),
    ).toBe(1);
    expect(
      (
        await db
          .getRepository(UserPhilosopherCount)
          .findOneByOrFail({ userId: user.id })
      ).count,
    ).toBe(1);
    const record = await db
      .getRepository(UserAnswer)
      .findOneByOrFail({ userId: user.id });
    expect(record.serviceDate).toBe(payload(results[0]).serviceDate);
  });
  it('expires unanswered questions and persists exhaustion without repeating questions', async () => {
    const { user, token } = await dailyUser();
    const first = await today(token).expect(200);
    await db
      .getRepository(User)
      .update(user.id, { nextDailyAt: new Date(Date.now() - 1000) });
    const second = await today(token).expect(200);
    expect(second.body).toMatchObject({
      userDailyQuestion: 'preparing',
      message: '새 질문을 준비 중이에요',
    });
    expect(
      (
        await db
          .getRepository(UserDailyQuestion)
          .findOneByOrFail({ id: payload(first).cycleId })
      ).status,
    ).toBe('expired');
    await post('daily/answers/stage1', token, {
      questionId: payload(first).questionId,
      answerId: '1',
    }).expect(403);
    await today(token).expect(200);
    expect(
      await db.getRepository(UserDailyQuestion).countBy({ userId: user.id }),
    ).toBe(2);
  });
  it('keeps today when changing schedule and applies new time on the next local date', async () => {
    const { user, token } = await dailyUser();
    const first = await today(token).expect(200);
    // This case models a next delivery on TOMORROW's local date. Before 08:00
    // the first-question flow can otherwise schedule today's 08:00 boundary,
    // which must remain unchanged and is a different valid production case.
    await db.getRepository(User).update(user.id, {
      nextDailyAt: dailyBoundary(new Date(), '08:00', 'Asia/Seoul', true),
    });
    await request(app.getHttpServer() as Server)
      .patch('/api/users/me/daily-time')
      .set('Authorization', 'Bearer ' + token)
      .send({ dailyQuestionTime: '10:00', timezone: 'Asia/Seoul' })
      .expect(200);
    const saved = await db.getRepository(User).findOneByOrFail({ id: user.id });
    expect(saved.dailyQuestionTime).toBe('08:00:00');
    expect(saved.pendingDailyQuestionTime).toBe('10:00:00');
    expect(saved.nextDailyAt).toEqual(saved.dailyScheduleEffectiveAt);
    expect(payload(await today(token)).cycleId).toBe(payload(first).cycleId);
    await db.getRepository(User).update(user.id, {
      dailyScheduleEffectiveAt: new Date(Date.now() - 1000),
      nextDailyAt: new Date(Date.now() - 1000),
    });
    await today(token).expect(200);
    const applied = await db
      .getRepository(User)
      .findOneByOrFail({ id: user.id });
    expect(applied.dailyQuestionTime).toBe('10:00:00');
    expect(applied.pendingDailyQuestionTime).toBeNull();
  });
  it('claims one push across workers, retries expired leases and ignores stale acknowledgements', async () => {
    const { user } = await dailyUser();
    const daily = app.get(DailyService);
    const claims = await Promise.all([
      daily.claimNotification(user.userId),
      daily.claimNotification(user.userId),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    const first = claims.find((c) => c !== null)!;
    await db.getRepository(UserDailyQuestion).update(first.cycleId, {
      notificationAttemptAt: new Date(Date.now() - 180000),
    });
    const retry = (await daily.claimNotification(user.userId))!;
    expect(retry.token).not.toBe(first.token);
    await daily.finishNotification(
      user.userId,
      first.cycleId,
      first.token,
      'sent',
    );
    expect(
      (
        await db
          .getRepository(UserDailyQuestion)
          .findOneByOrFail({ id: first.cycleId })
      ).notificationStatus,
    ).toBe('sending');
    await daily.finishNotification(
      user.userId,
      retry.cycleId,
      retry.token,
      'sent',
    );
    expect(await daily.claimNotification(user.userId)).toBeNull();
  });
  it('does not send notifications when disabled and keeps onboarding archive links accessible', async () => {
    const { user, token } = await dailyUser();
    await db
      .getRepository(User)
      .update(user.id, { notificationEnabled: false });
    expect(
      await app.get(DailyService).claimNotification(user.userId),
    ).toBeNull();
    const record = await db
      .getRepository(UserAnswer)
      .save(UserAnswer.onboarding(user.id, questions[0].answers[0].id));
    await request(app.getHttpServer() as Server)
      .get('/api/archive/' + record.id)
      .set('Authorization', 'Bearer ' + token)
      .expect(200);
    const other = await dailyUser();
    await request(app.getHttpServer() as Server)
      .get('/api/archive/' + record.id)
      .set('Authorization', 'Bearer ' + other.token)
      .expect(404);
  });
  it('waits until the first configured time and rejects malformed timezone and answer IDs', async () => {
    const { user, token } = await dailyUser();
    await db
      .getRepository(User)
      .update(user.id, { nextDailyAt: new Date(Date.now() + 3600000) });
    expect((await today(token).expect(200)).body).toMatchObject({
      userDailyQuestion: 'waiting',
    });
    await post('daily/answers/stage1', token, {
      questionId: 1,
      answerId: '1',
    }).expect(400);
    await request(app.getHttpServer() as Server)
      .patch('/api/users/me/daily-time')
      .set('Authorization', 'Bearer ' + token)
      .send({ dailyQuestionTime: '08:00', timezone: 'Unknown/Timezone' })
      .expect(400);
    const incomplete = await newUser();
    await today(incomplete.token).expect(403);
  });
  it('rolls back a daily answer if aggregate storage fails', async () => {
    const { user, token } = await dailyUser();
    const current = payload(await today(token).expect(200));
    const q = await db.getRepository(Question).findOneOrFail({
      where: { id: current.questionId },
      relations: { answers: true, followupAnswers: true },
    });
    if (q.type === QuestionType.TWO_STAGE) {
      await post('daily/answers/stage1', token, answer(q)).expect(201);
    }
    const complete = () =>
      q.type === QuestionType.TWO_STAGE
        ? post('daily/answers/stage2', token, {
            questionId: q.id,
            followupAnswerId: q.followupAnswers[0].id,
          })
        : post('daily/answers/stage1', token, answer(q));
    const counts = app.get<UserPhilosopherCountRepository>(
      USER_PHILOSOPHER_COUNT_REPOSITORY,
    );
    const failure = jest
      .spyOn(counts, 'increase')
      .mockRejectedValueOnce(new Error('simulated count failure'));
    try {
      await complete().expect(500);
    } finally {
      failure.mockRestore();
    }
    expect(
      await db.getRepository(UserAnswer).countBy({ userId: user.id }),
    ).toBe(0);
    expect(
      (
        await db
          .getRepository(UserDailyQuestion)
          .findOneByOrFail({ id: current.cycleId })
      ).status,
    ).toBe('pending');
    await complete().expect(201);
  });
  it('returns an explanation without opening the app for a single-stage question', async () => {
    const q = await dailyQuestion(QuestionType.SINGLE);
    const { user, token } = await dailyUser();
    // Mark other candidates as served for this isolated user only.
    const others = await db
      .getRepository(Question)
      .findBy({ usage: QuestionUsage.DAILY, type: QuestionType.TWO_STAGE });
    for (const other of others)
      await db.getRepository(UserDailyQuestion).save({
        userId: user.id,
        questionId: other.id,
        serviceDate: '2000-01-01',
        status: DailyQuestionStatus.EXPIRED,
      });
    expect(payload(await today(token).expect(200)).questionId).toBe(q.id);
    const response = await post(
      'daily/answers/stage1',
      token,
      answer(q),
    ).expect(201);
    expect(response.body).toMatchObject({
      requiresApp: false,
      explanation: '설명',
    });
    await post('daily/answers/stage2', token, {
      questionId: q.id,
      followupAnswerId: q.followupAnswers[0].id,
    }).expect(403);
  });
  async function adminUser() {
    const result = await newUser();
    await db
      .getRepository(User)
      .update(result.user.id, { userRole: UserRole.ADMIN });
    return result;
  }
  function put(path: string, token: string, body: object) {
    return request(app.getHttpServer() as Server)
      .put('/api/' + path)
      .set('Authorization', 'Bearer ' + token)
      .send(body);
  }
  it('checks current DB admin rights even for an existing JWT and rejects privilege injection', async () => {
    const { user, token } = await newUser();
    await post('admin/categories', token, {
      name: '권한',
      sortOrder: 1,
    }).expect(403);
    await db.getRepository(User).update(user.id, { userRole: UserRole.ADMIN });
    await post('admin/categories', token, {
      name: '권한',
      sortOrder: 1,
    }).expect(201);
    await post('admin/categories', token, {
      name: '권한',
      sortOrder: 1,
      userRole: 'admin',
    }).expect(400);
    await db.getRepository(User).update(user.id, { userRole: UserRole.USER });
    await post('admin/categories', token, {
      name: '권한',
      sortOrder: 1,
    }).expect(403);
  });
  it('creates and edits content while preserving chosen IDs and transferring philosopher counts', async () => {
    const admin = await adminUser();
    const category = payload(
      await post('admin/categories', admin.token, {
        name: '운영',
        sortOrder: 2,
      }).expect(201),
    );
    const makePh = (name: string) => ({
      name,
      era: '현대',
      school: '학파',
      coreThought: '생각',
      lifeRoots: '생애',
      imageKey: null,
    });
    const ph1 = payload(
      await post('admin/philosophers', admin.token, makePh('첫 사상가')).expect(
        201,
      ),
    );
    const ph2 = payload(
      await post(
        'admin/philosophers',
        admin.token,
        makePh('다음 사상가'),
      ).expect(201),
    );
    const input = {
      usage: 'daily',
      type: 'single',
      title: '운영 문제',
      stage1Body: '수정 전',
      isActive: true,
      status: ContentStatus.PUBLISHED,
      categoryIds: [category.id],
      answers: [
        { body: 'A', philosopherId: ph1.id, explanation: '해설 A' },
        { body: 'B', philosopherId: ph2.id, explanation: '해설 B' },
      ],
      followupAnswers: [],
    };
    const response = await post('admin/questions', admin.token, input).expect(
      201,
    );
    const q = response.body as Question;
    const { user, token } = await dailyUser();
    await db.getRepository(UserDailyQuestion).save({
      userId: user.id,
      questionId: q.id,
      serviceDate: '2026-09-30',
      openedAt: new Date(),
    });
    await db
      .getRepository(User)
      .update(user.id, { nextDailyAt: new Date(Date.now() + 3600000) });
    await post('daily/answers/stage1', token, {
      questionId: q.id,
      answerId: q.answers[0].id,
    }).expect(201);
    const edited = {
      ...input,
      stage1Body: '수정 후',
      answers: input.answers.map((a, i) => ({
        ...a,
        id: q.answers[i].id,
        philosopherId: ph2.id,
      })),
    };
    await put('admin/questions/' + q.id, admin.token, edited).expect(200);
    const counts = await db
      .getRepository(UserPhilosopherCount)
      .findBy({ userId: user.id });
    expect(counts.map((c) => [c.philosopherId, c.count])).toEqual([
      [ph2.id, 1],
    ]);
    const saved = await db
      .getRepository(UserAnswer)
      .findOneByOrFail({ userId: user.id });
    expect(saved.answerId).toBe(q.answers[0].id);
    const archive = await request(app.getHttpServer() as Server)
      .get('/api/archive/' + saved.id)
      .set('Authorization', 'Bearer ' + token)
      .expect(200);
    expect(archive.body).toMatchObject({ questionBody: '수정 후' });
    await put('admin/questions/' + q.id, admin.token, {
      ...edited,
      answers: input.answers,
    }).expect(409);
    await request(app.getHttpServer() as Server)
      .delete('/api/admin/philosophers/' + ph2.id)
      .set('Authorization', 'Bearer ' + admin.token)
      .expect(409);
    const postResult = payload(
      await post('admin/posts', admin.token, {
        philosopherId: ph1.id,
        title: '코스',
        imageKey: null,
      }).expect(201),
    );
    const segment = payload(
      await post('admin/segments', admin.token, {
        postId: postResult.id,
        segmentType: 'text',
        body: '카드',
        sortOrder: 0,
      }).expect(201),
    );
    await put('admin/segments/' + segment.id, admin.token, {
      postId: postResult.id,
      segmentType: 'image',
      imageKey: null,
      sortOrder: 0,
    }).expect(400);
    await request(app.getHttpServer() as Server)
      .delete('/api/admin/questions/' + q.id)
      .set('Authorization', 'Bearer ' + admin.token)
      .expect(200);
    expect(
      (await db.getRepository(Question).findOneByOrFail({ id: q.id })).isActive,
    ).toBe(false);
    expect(
      await db.getRepository(UserAnswer).countBy({ userId: user.id }),
    ).toBe(1);
  });
  it('reviews whole posts atomically and hides draft/held content from public learning', async () => {
    const admin = await adminUser();
    const viewer = await newUser();
    const thinker = await db.getRepository(Philosopher).save({
      name: '검수 철학자',
      era: '현대',
      school: '학파',
      coreThought: '생각',
      lifeRoots: '생애',
    });
    const input = {
      philosopherId: thinker.id,
      title: '검수 게시글',
      segments: [
        { segmentType: 'text', body: '첫 카드' },
        { segmentType: 'text', body: '두 번째 카드' },
      ],
    };
    const draft = payload(
      await post('admin/posts', admin.token, input).expect(201),
    );
    expect(draft.status).toBe('draft');
    const read = (path: string, token = viewer.token) =>
      request(app.getHttpServer() as Server)
        .get('/api/' + path)
        .set('Authorization', 'Bearer ' + token);
    await read('philosophers/post/' + draft.id).expect(404);
    const listed = await read(
      'admin/posts?status=draft&search=' + encodeURIComponent('검수'),
      admin.token,
    ).expect(200);
    expect((listed.body as Array<{ id: string }>).map((p) => p.id)).toContain(
      draft.id,
    );
    const details = (
      await read('admin/posts/' + draft.id, admin.token).expect(200)
    ).body as { segments: PostSegment[] };
    const cards = details.segments.map((c) => ({
      id: c.id,
      segmentType: c.segmentType,
      body: c.body,
    }));
    const published = {
      ...input,
      status: 'published',
      segments: [...cards].reverse(),
    };
    await put('admin/posts/' + draft.id, admin.token, published).expect(200);
    const visible = (await read('philosophers/post/' + draft.id).expect(200))
      .body as { segments: { body: string }[] };
    expect((visible.segments as { body: string }[]).map((c) => c.body)).toEqual(
      ['두 번째 카드', '첫 카드'],
    );
    await put('admin/posts/' + draft.id, admin.token, {
      ...published,
      segments: [{ ...cards[0], id: '999999999' }],
    }).expect(400);
    const before = await db
      .getRepository(LearningPost)
      .findOneByOrFail({ id: draft.id });
    // Exercise a real DB failure inside the transaction; transaction-bound repositories
    // are not the same object as db.getRepository() outside the request.
    await db.query(`ALTER TABLE post_segment ADD CONSTRAINT ethica_test_card_failure
      CHECK (body <> 'must roll back card')`);
    try {
      await put('admin/posts/' + draft.id, admin.token, {
        ...published,
        title: 'must roll back',
        segments: [{ ...cards[0], body: 'must roll back card' }],
      }).expect(500);
    } finally {
      await db.query(
        'ALTER TABLE post_segment DROP CHECK ethica_test_card_failure',
      );
    }
    expect(
      (await db.getRepository(LearningPost).findOneByOrFail({ id: draft.id }))
        .title,
    ).toBe(before.title);
    expect(
      await db.getRepository(PostSegment).countBy({ postId: draft.id }),
    ).toBe(2);
    await put('admin/posts/' + draft.id, admin.token, {
      ...published,
      status: 'held',
    }).expect(200);
    await read('philosophers/post/' + draft.id).expect(404);
  });
  it('isolates inquiries, supports admin answers, and only publishes selected notices and real terms', async () => {
    const owner = await newUser(),
      other = await newUser(),
      admin = await adminUser();
    const inquiry = payload(
      await post('inquiries', owner.token, {
        title: '도움',
        content: '질문',
      }).expect(201),
    );
    await request(app.getHttpServer() as Server)
      .get('/api/inquiries/' + inquiry.id)
      .set('Authorization', 'Bearer ' + other.token)
      .expect(404);
    await request(app.getHttpServer() as Server)
      .patch('/api/admin/inquiries/' + inquiry.id + '/answer')
      .set('Authorization', 'Bearer ' + admin.token)
      .send({ answerContent: '답변' })
      .expect(200);
    const answered = await request(app.getHttpServer() as Server)
      .get('/api/inquiries/' + inquiry.id)
      .set('Authorization', 'Bearer ' + owner.token)
      .expect(200);
    expect(answered.body).toMatchObject({
      status: 'answered',
      answerContent: '답변',
    });
    expect(answered.body).not.toHaveProperty('userId');
    const notice = payload(
      await post('admin/notices', admin.token, {
        title: '공지',
        content: '내용',
        isPublished: false,
      }).expect(201),
    );
    await request(app.getHttpServer() as Server)
      .get('/api/notices/' + notice.id)
      .expect(404);
    await put('admin/notices/' + notice.id, admin.token, {
      title: '공지',
      content: '공개',
      isPublished: true,
    }).expect(200);
    await request(app.getHttpServer() as Server)
      .get('/api/notices/' + notice.id)
      .expect(200);
    await request(app.getHttpServer() as Server)
      .get('/api/terms')
      .expect(200);
    await put('admin/terms', admin.token, {
      type: 'service',
      title: '테스트 약관',
      content: '테스트 전용',
      version: 'test-1',
    }).expect(200);
    expect(
      (
        await request(app.getHttpServer() as Server)
          .get('/api/terms')
          .expect(200)
      ).body,
    ).toMatchObject({ version: 'test-1' });
  });
  it('erases a reauthenticated account, invalidates sessions and allows a fresh registration', async () => {
    const { user, token } = await newUser();
    await db
      .getRepository(AuthIdentity)
      .save(
        AuthIdentity.createSocial(
          user.id,
          AuthType.GOOGLE,
          'withdraw-owner',
          null,
        ),
      );
    const challenge = await db.getRepository(AuthChallenge).save({
      id: randomUUID(),
      provider: AuthType.GOOGLE,
      nonce: 'withdraw-nonce',
      expiresAt: new Date(Date.now() + 300000),
    });
    await db
      .getRepository(RefreshToken)
      .save(
        RefreshToken.issue(
          user.id,
          'f'.repeat(64),
          new Date(Date.now() + 3600000),
        ),
      );
    const input = {
      provider: 'google',
      challengeId: challenge.id,
      idToken: 'fresh-id-token',
      credential: 'private-access-token',
    };
    const withdraw = () =>
      request(app.getHttpServer() as Server)
        .delete('/api/users/me')
        .set('Authorization', 'Bearer ' + token)
        .send(input);
    socialVerifier.verify.mockResolvedValueOnce({
      provider: AuthType.GOOGLE,
      subject: 'someone-else',
      email: null,
      name: null,
    });
    await withdraw().expect(401);
    expect(
      (await db.getRepository(User).findOneByOrFail({ id: user.id })).deletedAt,
    ).toBeNull();
    socialVerifier.verify.mockResolvedValue({
      provider: AuthType.GOOGLE,
      subject: 'withdraw-owner',
      email: null,
      name: null,
    });
    revoker.prepare.mockResolvedValue({
      provider: AuthType.GOOGLE,
      token: 'private-access-token',
    });
    await db
      .getRepository(UserAnswer)
      .save(UserAnswer.onboarding(user.id, questions[0].answers[0].id));
    await db
      .getRepository(Inquiry)
      .save({ userId: user.id, title: 'private', content: 'erase me' });
    revoker.revoke.mockRejectedValueOnce(new Error('provider unavailable'));
    await withdraw().expect(503);
    expect(
      await db.getRepository(User).findOneBy({ id: user.id }),
    ).not.toBeNull();
    expect(
      await db.getRepository(AuthChallenge).findOneBy({ id: challenge.id }),
    ).not.toBeNull();
    revoker.revoke.mockResolvedValue(undefined);
    await withdraw().expect(200);
    await request(app.getHttpServer() as Server)
      .get('/api/users/me')
      .set('Authorization', 'Bearer ' + token)
      .expect(401);
    expect(
      await db.getRepository(RefreshToken).countBy({ userId: user.id }),
    ).toBe(0);
    expect(
      await db
        .getRepository(User)
        .findOne({ where: { id: user.id }, withDeleted: true }),
    ).toBeNull();
    for (const entity of [AuthIdentity, UserAnswer, Inquiry, RevocationJob]) {
      expect(await db.getRepository(entity).countBy({ userId: user.id })).toBe(
        0,
      );
    }
    const next = await request(app.getHttpServer() as Server)
      .post('/api/auth/social/challenge')
      .send({ provider: 'google' })
      .expect(201);
    const joined = await request(app.getHttpServer() as Server)
      .post('/api/auth/login/social')
      .send({
        provider: 'google',
        challengeId: (next.body as { challengeId: string }).challengeId,
        idToken: 'fresh-token',
      })
      .expect(201);
    const rejoined = joined.body as {
      user: { userId: string; onboardingStatus: string };
    };
    expect(rejoined.user.userId).not.toBe(user.userId);
    expect(rejoined.user.onboardingStatus).toBe('incomplete');
  });
  it('keeps encrypted legacy revocation retries fenced by a lease', async () => {
    const { user } = await newUser();
    const vault = app.get<CredentialCipher>(CREDENTIAL_CIPHER);
    await db.getRepository(RevocationJob).save({
      userId: user.id,
      encryptedCredential: vault.encrypt('private-access-token'),
      nextAttemptAt: new Date(),
    });
    const row = await db
      .getRepository(RevocationJob)
      .createQueryBuilder('job')
      .addSelect('job.encryptedCredential')
      .where('job.userId = :id', { id: user.id })
      .getOneOrFail();
    expect(row.encryptedCredential).not.toContain('private-access-token');
    expect(vault.decrypt(row.encryptedCredential!)).toContain(
      'private-access-token',
    );
    const store = app.get<AccountStore>(ACCOUNT_STORE);
    const claims = await Promise.all([
      store.claim(new Date()),
      store.claim(new Date()),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    const first = claims.find((c) => c !== null)!;
    await store.finish(first.id, first.leaseToken!, false, new Date());
    await db
      .getRepository(RevocationJob)
      .update(first.id, { nextAttemptAt: new Date(Date.now() - 1000) });
    const retry = (await store.claim(new Date()))!;
    await store.finish(first.id, first.leaseToken!, true, new Date());
    expect(
      (await db.getRepository(RevocationJob).findOneByOrFail({ id: first.id }))
        .status,
    ).toBe('processing');
    await store.finish(retry.id, retry.leaseToken!, true, new Date());
    const done = await db
      .getRepository(RevocationJob)
      .createQueryBuilder('job')
      .addSelect('job.encryptedCredential')
      .where('job.id = :id', { id: first.id })
      .getOneOrFail();
    expect(done.status).toBe('done');
    expect(done.encryptedCredential).toBeNull();
    const admin = await adminUser();
    const visible = await request(app.getHttpServer() as Server)
      .get('/api/admin/revocations')
      .set('Authorization', 'Bearer ' + admin.token)
      .expect(200);
    expect(JSON.stringify(visible.body)).not.toContain('encryptedCredential');
  });
  it('adds the thinker catalog idempotently without replacing existing profiles, posts or answers', async () => {
    const kant = await db
      .getRepository(Philosopher)
      .findOneByOrFail({ name: '이마누엘 칸트' });
    const mill = await db
      .getRepository(Philosopher)
      .findOneByOrFail({ name: '존 스튜어트 밀' });
    await db.getRepository(Philosopher).update(kant.id, {
      coreThought: '운영자가 수정한 사상 소개',
      imageKey: null,
    });
    await db
      .getRepository(Philosopher)
      .update(mill.id, { imageKey: 'operator-owned.jpg' });
    const originals = await db.getRepository(Philosopher).find();
    const oldPosts = await db.getRepository(LearningPost).find();
    const oldAnswers = await db.getRepository(Answer).find();
    const oldCounts = await db.getRepository(UserPhilosopherCount).find();
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      await new ThinkerProfiles1791000000000().up(runner);
      await runner.commitTransaction();
      const first = await db
        .getRepository(Philosopher)
        .find({ order: { id: 'ASC' } });
      await runner.startTransaction();
      await new ThinkerProfiles1791000000000().up(runner);
      await runner.commitTransaction();
      expect(
        await db.getRepository(Philosopher).find({ order: { id: 'ASC' } }),
      ).toEqual(first);
      for (const original of originals) {
        const current = first.find((p) => p.id === original.id)!;
        expect(current.name).toBe(original.name);
        expect(current.coreThought).toBe(original.coreThought);
        expect(current.era).toBe(original.era);
        expect(current.school).toBe(original.school);
        expect(current.lifeRoots.startsWith(original.lifeRoots)).toBe(true);
      }
      expect(first.find((p) => p.id === kant.id)!.lifeRoots).toBe(
        kant.lifeRoots + portraitAttribution('kant'),
      );
      expect(first.find((p) => p.id === mill.id)!.imageKey).toBe(
        'operator-owned.jpg',
      );
      expect(first.find((p) => p.id === mill.id)!.lifeRoots).toBe(
        mill.lifeRoots,
      );
      for (const profile of thinkerProfilesV1)
        expect(first.filter((p) => p.name === profile.name)).toHaveLength(1);
      expect(await db.getRepository(LearningPost).find()).toEqual(oldPosts);
      expect(await db.getRepository(Answer).find()).toEqual(oldAnswers);
      expect(await db.getRepository(UserPhilosopherCount).find()).toEqual(
        oldCounts,
      );
      const user = await newUser();
      const odysseus = first.find((p) => p.name === '오디세우스')!;
      const detail = await request(app.getHttpServer() as Server)
        .get('/api/philosophers/' + odysseus.id)
        .set('Authorization', 'Bearer ' + user.token)
        .expect(200);
      const body = detail.body as {
        school: string;
        posts: unknown[];
        imageKey: string;
        lifeRoots: string;
      };
      expect(body.school).toBe('신화·문학 인물');
      expect(body.posts).toEqual([]);
      expect(body.imageKey).toBe('thinker-v1-odysseus.jpg');
      expect(body.lifeRoots).toContain('commons.wikimedia.org');
      await request(app.getHttpServer() as Server)
        .get('/api/media/thinker-v1-odysseus.jpg')
        .expect(200);
    } finally {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it('atomically replaces only the five legacy articles, publishes ten ordered articles and preserves other data', async () => {
    const unrelatedPosts = await db
      .getRepository(LearningPost)
      .find({ order: { id: 'ASC' } });
    const unrelatedCards = await db
      .getRepository(PostSegment)
      .find({ order: { id: 'ASC' } });
    const profiles = await db
      .getRepository(Philosopher)
      .find({ order: { id: 'ASC' } });
    const answers = await db
      .getRepository(Answer)
      .find({ order: { id: 'ASC' } });
    const counts = await db.getRepository(UserPhilosopherCount).find();
    const legacyIds: string[] = [];
    // This suite starts at the schema/onboarding migrations; reproduce the five
    // released v1 posts without rerunning unrelated daily question migrations.
    for (const post of postsV1) {
      const thinker = profiles.find(
        (p) => p.name === philosophersV1[post.philosopher].name,
      )!;
      const inserted = await db.query<{ insertId: number }>(
        'INSERT INTO post (philosopher_id, title, image_key, status) VALUES (?, ?, ?, ?)',
        [thinker.id, post.title, contentImage(post.image), 'published'],
      );
      const postId = String(inserted.insertId);
      legacyIds.push(postId);
      for (const [order, body] of post.cards.entries())
        await db.query(
          'INSERT INTO post_segment (post_id, segment_type, body, image_key, sort_order) VALUES (?, ?, ?, NULL, ?)',
          [postId, 'text', body, order],
        );
    }
    const snapshot = await db
      .getRepository(LearningPost)
      .find({ order: { id: 'ASC' } });
    const snapshotCards = await db
      .getRepository(PostSegment)
      .find({ order: { id: 'ASC' } });
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      // A modified legacy card must be preserved and block destructive replacement.
      await runner.startTransaction();
      await runner.query(
        'UPDATE post_segment SET body = ? WHERE post_id = ? AND sort_order = 0',
        ['operator edit', legacyIds[0]],
      );
      await expect(
        new ReplaceLearningPosts1791003600000().up(runner),
      ).rejects.toThrow('Legacy cards changed');
      await runner.rollbackTransaction();

      // Simulate failure after deletion and the first new insert; a real MySQL
      // transaction must restore old post AND child-card IDs and contents.
      await runner.startTransaction();
      const originalQuery = runner.query.bind(runner) as (
        sql: string,
        parameters?: unknown[],
      ) => Promise<unknown>;
      const failingQuery = jest
        .spyOn(runner, 'query')
        .mockImplementation((sql: string, parameters?: unknown[]) => {
          if (sql.startsWith('INSERT INTO post_segment'))
            return Promise.reject(new Error('injected card failure'));
          return originalQuery(sql, parameters);
        });
      await expect(
        new ReplaceLearningPosts1791003600000().up(runner),
      ).rejects.toThrow('injected card failure');
      failingQuery.mockRestore();
      await runner.rollbackTransaction();
      expect(
        await db.getRepository(LearningPost).find({ order: { id: 'ASC' } }),
      ).toEqual(snapshot);
      expect(
        await db.getRepository(PostSegment).find({ order: { id: 'ASC' } }),
      ).toEqual(snapshotCards);

      await runner.startTransaction();
      await new ReplaceLearningPosts1791003600000().up(runner);
      await runner.commitTransaction();
      const after = await db
        .getRepository(LearningPost)
        .find({ order: { id: 'ASC' } });
      expect(after).toHaveLength(unrelatedPosts.length + 10);
      for (const p of unrelatedPosts)
        expect(after.find((row) => row.id === p.id)).toEqual(p);
      for (const id of legacyIds) {
        expect(after.some((p) => p.id === id)).toBe(false);
        expect(
          await db.getRepository(PostSegment).countBy({ postId: id }),
        ).toBe(0);
      }
      for (const card of unrelatedCards)
        expect(
          await db.getRepository(PostSegment).findOneByOrFail({ id: card.id }),
        ).toEqual(card);
      expect(
        await db.getRepository(Philosopher).find({ order: { id: 'ASC' } }),
      ).toEqual(profiles);
      expect(
        await db.getRepository(Answer).find({ order: { id: 'ASC' } }),
      ).toEqual(answers);
      expect(await db.getRepository(UserPhilosopherCount).find()).toEqual(
        counts,
      );
      const user = await newUser();
      for (const post of learningPostsV2) {
        const current = after.find((p) => p.title === post.title)!;
        expect(current.status).toBe(ContentStatus.PUBLISHED);
        expect(current.imageKey).toBe(articleImage(post).imageKey);
        const result = await request(app.getHttpServer() as Server)
          .get('/api/philosophers/post/' + current.id)
          .set('Authorization', 'Bearer ' + user.token)
          .expect(200);
        const body = result.body as {
          segments: Array<{
            body: string | null;
            imageKey: string | null;
            sortOrder: number;
          }>;
        };
        expect(body.segments).toHaveLength(8);
        expect(body.segments.map((s) => s.sortOrder)).toEqual([
          0, 1, 2, 3, 4, 5, 6, 7,
        ]);
        expect(body.segments[0].imageKey).toBe(articleImage(post).imageKey);
        expect(body.segments.slice(1, 7).map((s) => s.body)).toEqual(
          post.cards,
        );
        expect(body.segments[7].body).toBe(articleCredits(post));
        await request(app.getHttpServer() as Server)
          .get('/api/media/' + current.imageKey)
          .expect(200);
      }
      for (const id of legacyIds)
        await request(app.getHttpServer() as Server)
          .get('/api/philosophers/post/' + id)
          .set('Authorization', 'Bearer ' + user.token)
          .expect(404);
      await runner.startTransaction();
      await expect(
        new ReplaceLearningPosts1791003600000().up(runner),
      ).rejects.toThrow('Legacy post missing');
      await runner.rollbackTransaction();
      expect(await db.getRepository(LearningPost).count()).toBe(after.length);
    } finally {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it('illustrates all 80 cards atomically without replacing IDs, prose or unrelated data', async () => {
    const posts = await db
      .getRepository(LearningPost)
      .find({ order: { id: 'ASC' } });
    const before = await db
      .getRepository(PostSegment)
      .find({ order: { id: 'ASC' } });
    const profiles = await db
      .getRepository(Philosopher)
      .find({ order: { id: 'ASC' } });
    const questionsBefore = await db
      .getRepository(Question)
      .find({ order: { id: 'ASC' } });
    const usersBefore = await db
      .getRepository(User)
      .find({ order: { id: 'ASC' } });
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      const target = posts.find((p) => p.title === learningPostsV2[0].title)!;
      await runner.startTransaction();
      await runner.query(
        'UPDATE post_segment SET body = ? WHERE post_id = ? AND sort_order = 1',
        ['operator edit', target.id],
      );
      await expect(
        new IllustrateLearningSlides1791007200000().up(runner),
      ).rejects.toThrow('Learning cards changed');
      await runner.rollbackTransaction();

      await runner.startTransaction();
      const originalQuery = runner.query.bind(runner) as (
        sql: string,
        parameters?: unknown[],
      ) => Promise<unknown>;
      let writes = 0;
      const spy = jest
        .spyOn(runner, 'query')
        .mockImplementation((sql: string, parameters?: unknown[]) => {
          if (sql.startsWith('UPDATE post_segment') && ++writes === 2)
            return Promise.reject(new Error('injected illustration failure'));
          return originalQuery(sql, parameters);
        });
      await expect(
        new IllustrateLearningSlides1791007200000().up(runner),
      ).rejects.toThrow('injected illustration failure');
      spy.mockRestore();
      await runner.rollbackTransaction();
      expect(
        await db.getRepository(PostSegment).find({ order: { id: 'ASC' } }),
      ).toEqual(before);

      await runner.startTransaction();
      await new IllustrateLearningSlides1791007200000().up(runner);
      await runner.commitTransaction();
      const after = await db
        .getRepository(PostSegment)
        .find({ order: { id: 'ASC' } });
      expect(after.map((c) => c.id)).toEqual(before.map((c) => c.id));
      expect(
        await db.getRepository(LearningPost).find({ order: { id: 'ASC' } }),
      ).toEqual(posts);
      expect(
        await db.getRepository(Philosopher).find({ order: { id: 'ASC' } }),
      ).toEqual(profiles);
      expect(
        await db.getRepository(Question).find({ order: { id: 'ASC' } }),
      ).toEqual(questionsBefore);
      expect(
        await db.getRepository(User).find({ order: { id: 'ASC' } }),
      ).toEqual(usersBefore);
      const targetIds = new Set(
        posts
          .filter((p) => learningPostsV2.some((a) => a.title === p.title))
          .map((p) => p.id),
      );
      expect(after.filter((c) => !targetIds.has(c.postId))).toEqual(
        before.filter((c) => !targetIds.has(c.postId)),
      );

      const user = await newUser();
      for (const article of learningPostsV2) {
        const post = posts.find((p) => p.title === article.title)!;
        const original = before
          .filter((c) => c.postId === post.id)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const response = await request(app.getHttpServer() as Server)
          .get('/api/philosophers/post/' + post.id)
          .set('Authorization', 'Bearer ' + user.token)
          .expect(200);
        const result = response.body as {
          segments: Array<{
            id: string;
            body: string | null;
            imageKey: string;
            sortOrder: number;
          }>;
        };
        expect(result.segments.map((s) => s.id)).toEqual(
          original.map((c) => c.id),
        );
        expect(result.segments.map((s) => s.sortOrder)).toEqual([
          0, 1, 2, 3, 4, 5, 6, 7,
        ]);
        expect(result.segments.map((s) => s.imageKey)).toEqual(
          slideImages(article).map((i) => i.imageKey),
        );
        expect(result.segments.slice(1, 7).map((s) => s.body)).toEqual(
          article.cards,
        );
        expect(result.segments[7].body).toBe(slideCredits(article));
      }
      for (const image of new Set(
        learningPostsV2.flatMap(slideImages).map((i) => i.imageKey),
      ))
        await request(app.getHttpServer() as Server)
          .get('/api/media/' + image)
          .expect('Content-Type', /^image\//)
          .expect(200);
    } finally {
      jest.restoreAllMocks();
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it('replaces duplicate slide images atomically, protects operator edits and preserves all non-image data', async () => {
    const posts = await db
      .getRepository(LearningPost)
      .find({ order: { id: 'ASC' } });
    const before = await db
      .getRepository(PostSegment)
      .find({ order: { id: 'ASC' } });
    const profiles = await db
      .getRepository(Philosopher)
      .find({ order: { id: 'ASC' } });
    const questions = await db
      .getRepository(Question)
      .find({ order: { id: 'ASC' } });
    const users = await db.getRepository(User).find({ order: { id: 'ASC' } });
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      const lastPost = posts.find((p) => p.title === learningPostsV2[9].title)!;
      await runner.startTransaction();
      await runner.query(
        'UPDATE post_segment SET image_key = ? WHERE post_id = ? AND sort_order = 7',
        ['operator-image.png', lastPost.id],
      );
      await expect(
        new UniqueLearningSlideImages1791010800000().up(runner),
      ).rejects.toThrow('Learning cards changed');
      await runner.rollbackTransaction();

      await runner.startTransaction();
      const originalQuery = runner.query.bind(runner) as (
        sql: string,
        parameters?: unknown[],
      ) => Promise<unknown>;
      let writes = 0;
      const spy = jest
        .spyOn(runner, 'query')
        .mockImplementation((sql: string, parameters?: unknown[]) => {
          if (sql.startsWith('UPDATE post_segment') && ++writes === 2)
            return Promise.reject(new Error('injected unique-image failure'));
          return originalQuery(sql, parameters);
        });
      await expect(
        new UniqueLearningSlideImages1791010800000().up(runner),
      ).rejects.toThrow('injected unique-image failure');
      spy.mockRestore();
      await runner.rollbackTransaction();
      expect(
        await db.getRepository(PostSegment).find({ order: { id: 'ASC' } }),
      ).toEqual(before);

      await runner.startTransaction();
      await new UniqueLearningSlideImages1791010800000().up(runner);
      await runner.commitTransaction();
      const after = await db
        .getRepository(PostSegment)
        .find({ order: { id: 'ASC' } });
      expect(after.map((c) => c.id)).toEqual(before.map((c) => c.id));
      expect(
        await db.getRepository(LearningPost).find({ order: { id: 'ASC' } }),
      ).toEqual(posts);
      expect(
        await db.getRepository(Philosopher).find({ order: { id: 'ASC' } }),
      ).toEqual(profiles);
      expect(
        await db.getRepository(Question).find({ order: { id: 'ASC' } }),
      ).toEqual(questions);
      expect(
        await db.getRepository(User).find({ order: { id: 'ASC' } }),
      ).toEqual(users);
      const targets = new Set(
        posts
          .filter((p) => learningPostsV2.some((a) => a.title === p.title))
          .map((p) => p.id),
      );
      expect(after.filter((c) => !targets.has(c.postId))).toEqual(
        before.filter((c) => !targets.has(c.postId)),
      );
      const user = await newUser();
      for (const article of learningPostsV2) {
        const post = posts.find((p) => p.title === article.title)!;
        const original = before
          .filter((c) => c.postId === post.id)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const response = await request(app.getHttpServer() as Server)
          .get('/api/philosophers/post/' + post.id)
          .set('Authorization', 'Bearer ' + user.token)
          .expect(200);
        const segments = (
          response.body as {
            segments: Array<{
              id: string;
              sortOrder: number;
              body: string | null;
              imageKey: string;
            }>;
          }
        ).segments;
        expect(segments.map((c) => c.id)).toEqual(original.map((c) => c.id));
        expect(segments.map((c) => c.sortOrder)).toEqual([
          0, 1, 2, 3, 4, 5, 6, 7,
        ]);
        expect(new Set(segments.map((c) => c.imageKey)).size).toBe(8);
        expect(segments.map((c) => c.imageKey)).toEqual(
          uniqueSlideImages(article).map((i) => i.imageKey),
        );
        expect(segments.slice(1, 7).map((c) => c.body)).toEqual(article.cards);
        expect(segments[7].body).toBe(uniqueSlideCredits(article));
      }
      for (const key of new Set(
        learningPostsV2.flatMap(uniqueSlideImages).map((i) => i.imageKey),
      ))
        await request(app.getHttpServer() as Server)
          .get('/api/media/' + key)
          .expect('Content-Type', /^image\//)
          .expect(200);
    } finally {
      jest.restoreAllMocks();
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it.each([
    {
      batch: '59-article library',
      articles: learningLibraryV5,
      imagesFor: libraryImages,
      creditsFor: libraryCredits,
      Migration: ExpandLearningLibrary1791025200000,
    },
    {
      batch: '12 philosopher stories',
      articles: learningStoriesV6,
      imagesFor: storyImages,
      creditsFor: storyCredits,
      Migration: PublishPhilosopherStories1791028800000,
    },
    {
      batch: '5 Camus works with 70 slides',
      articles: camusWorksV7,
      imagesFor: camusImages,
      creditsFor: camusCredits,
      Migration: PublishCamusWorks1791097200000,
    },
  ])(
    'appends $batch atomically and preserves every existing row',
    async ({ articles, imagesFor, creditsFor, Migration }) => {
      const before = await db
        .getRepository(LearningPost)
        .find({ order: { id: 'ASC' } });
      const beforeCards = await db
        .getRepository(PostSegment)
        .find({ order: { id: 'ASC' } });
      const profiles = await db
        .getRepository(Philosopher)
        .find({ order: { id: 'ASC' } });
      const oldQuestions = await db
        .getRepository(Question)
        .find({ order: { id: 'ASC' } });
      const oldUsers = await db
        .getRepository(User)
        .find({ order: { id: 'ASC' } });
      const runner = db.createQueryRunner();
      await runner.connect();
      try {
        await runner.startTransaction();
        const original = runner.query.bind(runner) as (
          sql: string,
          params?: unknown[],
        ) => Promise<unknown>;
        let cards = 0;
        const spy = jest
          .spyOn(runner, 'query')
          .mockImplementation((sql: string, params?: unknown[]) => {
            if (sql.startsWith('INSERT INTO post_segment') && ++cards === 13)
              return Promise.reject(new Error('injected library failure'));
            return original(sql, params);
          });
        await expect(new Migration().up(runner)).rejects.toThrow(
          'injected library failure',
        );
        spy.mockRestore();
        await runner.rollbackTransaction();
        expect(
          await db.getRepository(LearningPost).find({ order: { id: 'ASC' } }),
        ).toEqual(before);
        expect(
          await db.getRepository(PostSegment).find({ order: { id: 'ASC' } }),
        ).toEqual(beforeCards);

        await runner.startTransaction();
        await new Migration().up(runner);
        await runner.commitTransaction();
        const after = await db
          .getRepository(LearningPost)
          .find({ order: { id: 'ASC' } });
        const afterCards = await db
          .getRepository(PostSegment)
          .find({ order: { id: 'ASC' } });
        expect(after).toHaveLength(before.length + articles.length);
        expect(afterCards).toHaveLength(
          beforeCards.length +
            articles.reduce((sum, a) => sum + a.cards.length + 2, 0),
        );
        expect(after.filter((p) => before.some((b) => b.id === p.id))).toEqual(
          before,
        );
        expect(
          afterCards.filter((c) => beforeCards.some((b) => b.id === c.id)),
        ).toEqual(beforeCards);
        expect(
          await db.getRepository(Philosopher).find({ order: { id: 'ASC' } }),
        ).toEqual(profiles);
        expect(
          await db.getRepository(Question).find({ order: { id: 'ASC' } }),
        ).toEqual(oldQuestions);
        expect(
          await db.getRepository(User).find({ order: { id: 'ASC' } }),
        ).toEqual(oldUsers);
        const user = await newUser();
        for (const a of articles) {
          const post = after.find((p) => p.title === a.title)!;
          const response = await request(app.getHttpServer() as Server)
            .get('/api/philosophers/post/' + post.id)
            .set('Authorization', 'Bearer ' + user.token)
            .expect(200);
          const segments = (
            response.body as {
              segments: Array<{
                body: string | null;
                imageKey: string;
                sortOrder: number;
              }>;
            }
          ).segments;
          expect(segments.map((s) => s.sortOrder)).toEqual(
            Array.from({ length: a.cards.length + 2 }, (_, i) => i),
          );
          expect(segments.map((s) => s.imageKey)).toEqual(
            imagesFor(a).map((i) => i.imageKey),
          );
          expect(segments.slice(1, -1).map((s) => s.body)).toEqual(a.cards);
          expect(segments.at(-1)!.body).toBe(creditsFor(a));
        }
        for (const key of new Set(
          articles.flatMap(imagesFor).map((i) => i.imageKey),
        ))
          await request(app.getHttpServer() as Server)
            .get('/api/media/' + key)
            .expect('Content-Type', /^image\//)
            .expect(200);
        await runner.startTransaction();
        await expect(new Migration().up(runner)).rejects.toThrow(
          'already exists',
        );
        await runner.rollbackTransaction();
        expect(await db.getRepository(LearningPost).count()).toBe(after.length);
      } finally {
        jest.restoreAllMocks();
        if (runner.isTransactionActive) await runner.rollbackTransaction();
        await runner.release();
      }
    },
  );

  it('publishes 49 concept questions atomically, preserves history, and serves each new onboarding category', async () => {
    // Production retains the earlier Korean spelling; do not rename its row.
    await db.query('UPDATE philosopher SET name = ? WHERE name = ?', [
      '임마누엘 칸트',
      '이마누엘 칸트',
    ]);
    const tables = [
      'philosopher',
      'category',
      'question',
      'answer',
      'followup_answer',
      'users',
      'user_answer',
      'user_daily_question',
      'user_philosopher_count',
    ];
    const before = new Map<string, Array<{ id: string }>>();
    for (const table of tables)
      before.set(
        table,
        await db.query<Array<{ id: string }>>(
          `SELECT * FROM \`${table}\` ORDER BY id`,
        ),
      );
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      const original = runner.query.bind(runner) as (
        sql: string,
        params?: unknown[],
      ) => Promise<unknown>;
      let insertedAnswers = 0;
      const spy = jest
        .spyOn(runner, 'query')
        .mockImplementation((sql: string, params?: unknown[]) => {
          if (sql.startsWith('INSERT INTO answer ') && ++insertedAnswers === 20)
            return Promise.reject(new Error('injected concept failure'));
          return original(sql, params);
        });
      await expect(
        new ConceptQuestions1791079200000().up(runner),
      ).rejects.toThrow('injected concept failure');
      spy.mockRestore();
      await runner.rollbackTransaction();
      for (const table of tables)
        expect(
          await db.query(`SELECT * FROM \`${table}\` ORDER BY id`),
        ).toEqual(before.get(table));

      await runner.startTransaction();
      await new ConceptQuestions1791079200000().up(runner);
      await runner.commitTransaction();
      for (const table of tables) {
        const rows = await db.query<Array<{ id: string }>>(
          `SELECT * FROM \`${table}\` ORDER BY id`,
        );
        const oldIds = new Set(before.get(table)!.map((r) => String(r.id)));
        expect(rows.filter((r) => oldIds.has(String(r.id)))).toEqual(
          before.get(table),
        );
      }
      expect(await db.getRepository(Question).count()).toBe(
        before.get('question')!.length + 49,
      );
      expect(await db.getRepository(Answer).count()).toBe(
        before.get('answer')!.length + 98,
      );
      expect(await db.getRepository(FollowupAnswer).count()).toBe(
        before.get('followup_answer')!.length + 28,
      );
      const user = await newUser();
      const response = await request(app.getHttpServer() as Server)
        .get('/api/categories')
        .set('Authorization', 'Bearer ' + user.token)
        .expect(200);
      expect(JSON.stringify(response.body)).toContain('AI');
      for (const content of conceptCategoriesV2) {
        const category = await db
          .getRepository(Category)
          .findOneByOrFail({ name: content.name });
        const { token } = await newUser();
        await post('onboarding/question', token, {
          categoryId: category.id,
        }).expect(201);
        const response = await request(app.getHttpServer() as Server)
          .get('/api/onboarding/questions')
          .set('Authorization', 'Bearer ' + token)
          .expect(200);
        const payload = response.body as {
          items: Array<{ stage1Body: string }>;
        };
        expect(payload.items).toHaveLength(5);
        expect(payload.items.map((q) => q.stage1Body).sort()).toEqual(
          content.questions
            .filter((q) => q.usage === 'onboarding')
            .map((q) => q.body)
            .sort(),
        );
      }
      for (const q of conceptQuestionsV2) {
        const stored = await db
          .getRepository(Question)
          .findOneByOrFail({ title: q.title });
        expect(stored.status).toBe(ContentStatus.PUBLISHED);
        expect(stored.isActive).toBe(true);
        await request(app.getHttpServer() as Server)
          .get('/api/media/' + q.imageKey)
          .expect('Content-Type', /^image\//)
          .expect(200);
      }
      await runner.startTransaction();
      await expect(
        new ConceptQuestions1791079200000().up(runner),
      ).rejects.toThrow('title conflict');
      await runner.rollbackTransaction();
      expect(await db.getRepository(Question).count()).toBe(
        before.get('question')!.length + 49,
      );
    } finally {
      jest.restoreAllMocks();
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it('purges legacy withdrawn accounts after unlink, preserving accounts with pending unlink', async () => {
    const old = await newUser(),
      recent = await newUser();
    await db.getRepository(User).update(old.user.id, {
      deletedAt: new Date('2024-01-01T00:00:00Z'),
      userStatus: UserStatus.SUSPENDED,
    });
    await db.getRepository(User).update(recent.user.id, {
      deletedAt: new Date('2026-01-01T00:00:00Z'),
      userStatus: UserStatus.SUSPENDED,
    });
    await db.getRepository(RevocationJob).save({
      userId: recent.user.id,
      encryptedCredential: 'pending',
      nextAttemptAt: new Date(),
    });
    await db
      .getRepository(UserAnswer)
      .save(UserAnswer.onboarding(old.user.id, questions[0].answers[0].id));
    await db.getRepository(UserPhilosopherCount).save({
      userId: old.user.id,
      philosopherId: questions[0].answers[0].philosopherId,
      count: 1,
    });
    await db
      .getRepository(AuthIdentity)
      .save(
        AuthIdentity.createSocial(
          old.user.id,
          AuthType.GOOGLE,
          'purge-only',
          null,
        ),
      );
    await db
      .getRepository(Inquiry)
      .save({ userId: old.user.id, title: '보관', content: '삭제 대상' });
    const adminNotice = await db.getRepository(Notice).save({
      authorId: old.user.id,
      title: '유지',
      content: '공개 콘텐츠',
      isPublished: true,
    });
    expect(await app.get<AccountStore>(ACCOUNT_STORE).purge(new Date())).toBe(
      1,
    );
    expect(
      await db
        .getRepository(User)
        .findOne({ where: { id: old.user.id }, withDeleted: true }),
    ).toBeNull();
    expect(
      await db
        .getRepository(User)
        .findOne({ where: { id: recent.user.id }, withDeleted: true }),
    ).not.toBeNull();
    expect(
      await db.getRepository(UserAnswer).countBy({ userId: old.user.id }),
    ).toBe(0);
    expect(
      await db
        .getRepository(UserPhilosopherCount)
        .countBy({ userId: old.user.id }),
    ).toBe(0);
    expect(
      await db.getRepository(Inquiry).countBy({ userId: old.user.id }),
    ).toBe(0);
    expect(
      (await db.getRepository(Notice).findOneByOrFail({ id: adminNotice.id }))
        .authorId,
    ).toBeNull();
  });
});
