import { randomUUID } from 'node:crypto';
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
  async function newUser() {
    const user = await db.getRepository(User).save(User.create('테스트'));
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
  it('runs the full HTTP flow, serializes simultaneous submissions, and persists summary retries', async () => {
    const { user, token } = await newUser();
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
    expect(
      await db.getRepository(UserAnswer).countBy({ userId: user.id }),
    ).toBe(1);
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
    const counts = app.get<UserPhilosopherCountRepository>(
      USER_PHILOSOPHER_COUNT_REPOSITORY,
    );
    const failure = jest
      .spyOn(counts, 'increase')
      .mockRejectedValueOnce(new Error('simulated count failure'));
    try {
      await post('daily/answers/stage1', token, answer(q)).expect(500);
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
    await post('daily/answers/stage1', token, answer(q)).expect(201);
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
      .expect(404);
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
  it('requires matching reauthentication, revokes sessions immediately and stores only encrypted retry credentials', async () => {
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
    await withdraw().expect(200);
    await request(app.getHttpServer() as Server)
      .get('/api/users/me')
      .set('Authorization', 'Bearer ' + token)
      .expect(401);
    expect(
      await db.getRepository(RefreshToken).countBy({ userId: user.id }),
    ).toBe(0);
    const row = await db
      .getRepository(RevocationJob)
      .createQueryBuilder('job')
      .addSelect('job.encryptedCredential')
      .where('job.userId = :id', { id: user.id })
      .getOneOrFail();
    expect(row.encryptedCredential).not.toContain('private-access-token');
    const vault = app.get<CredentialCipher>(CREDENTIAL_CIPHER);
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
  it('purges only accounts deleted at least two years ago and removes all private records atomically', async () => {
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
    expect(
      await app
        .get<AccountStore>(ACCOUNT_STORE)
        .purge(new Date('2024-09-30T00:00:00Z')),
    ).toBe(1);
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
