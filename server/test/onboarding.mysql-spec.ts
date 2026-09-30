import {
  USER_SUMMARY_REPOSITORY,
  type UserSummaryRepository,
} from '../src/user/domain/repository/user-summary.repository';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
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
describe('Onboarding and analysis with MySQL', () => {
  let app: INestApplication;
  let db: DataSource;
  let category: Category;
  let questions: Question[];
  let jwt: JwtService;
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
      await runner.release();
    } finally {
      await baseline.destroy();
    }
    const module = await Test.createTestingModule({ imports: [AppModule] })
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
});
