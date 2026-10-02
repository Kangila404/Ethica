import { OnboardingService } from './onboarding.service';
import { User } from 'src/user/domain/model/user.entity';
import { UserStatus } from 'src/user/domain/enum/user-status.enum';
import { OnboardingStatus } from 'src/user/domain/enum/OnboardingStatus.enum';
import { Question } from 'src/question/domain/model/question.entity';
import { QuestionType } from 'src/question/domain/enum/question-type.enum';
import { QuestionUsage } from 'src/question/domain/enum/question-usage.enum';
import { OnboardingSession } from '../domain/model/onboarding-session.entity';
import { UserRepository } from 'src/user/domain/repository/user.repository';
import { UserAnswerRepository } from 'src/user-answer/domain/repository/user-answer.repository';
import { UserFollowupAnswerRepository } from 'src/user-answer/domain/repository/user-followup-answer.repository';
import { QuestionRepository } from 'src/question/domain/repository/question.repository';
import { UserPhilosopherCountRepository } from 'src/philosopher/domain/repository/user-philosopher-count.repository';
import { CategoryRepository } from 'src/category/domain/repository/category.repository';
import { AnalysisService } from 'src/analysis/application/analysis.service';
import { DailyService } from 'src/daily/application/daily.service';
jest.mock('typeorm-transactional', () => ({
  Transactional: () => () => undefined,
}));
// Repository doubles verify business rules; locking/rollback requires MySQL integration.
describe('OnboardingService', () => {
  let user: User;
  let session: OnboardingSession | null;
  let questions: Question[];
  let service: OnboardingService;
  const saveAnswer = jest.fn();
  const saveFollowup = jest.fn();
  const increase = jest.fn();
  const daily = { assignFirstQuestion: jest.fn() };
  const analysis = {
    getAnalysis: jest.fn().mockResolvedValue({ composition: [] }),
    getContradiction: jest.fn().mockResolvedValue({ status: 'pending' }),
  };
  beforeEach(() => {
    jest.clearAllMocks();
    session = null;
    user = Object.assign(new User(), {
      id: '1',
      userId: 'external',
      userStatus: UserStatus.ACTIVE,
      onboardingStatus: OnboardingStatus.INCOMPLETE,
    });
    questions = Array.from({ length: 5 }, (_, i) =>
      Object.assign(new Question(), {
        id: String(i + 1),
        usage: QuestionUsage.ONBOARDING,
        type: i === 0 ? QuestionType.TWO_STAGE : QuestionType.SINGLE,
        stage1Body: '문제',
        followupBody: '후속',
        answers: [
          { id: `${i + 1}1`, philosopherId: '1', body: 'A' },
          { id: `${i + 1}2`, philosopherId: '2', body: 'B' },
        ],
        followupAnswers: [
          { id: 'f1', body: '예' },
          { id: 'f2', body: '아니오' },
        ],
      }),
    );
    service = new OnboardingService(
      {
        findByUserId: jest.fn().mockResolvedValue(user),
        save: jest.fn(),
      } as unknown as UserRepository,
      {
        save: saveAnswer,
        countByUserId: jest.fn().mockResolvedValue(0),
      } as unknown as UserAnswerRepository,
      { save: saveFollowup } as unknown as UserFollowupAnswerRepository,
      {
        findOnboardingByCategory: jest
          .fn()
          .mockImplementation(() => Promise.resolve(questions)),
        findByIdWithAnswers: jest
          .fn()
          .mockImplementation((id: string) =>
            Promise.resolve(questions.find((q) => q.id === id) ?? null),
          ),
      } as unknown as QuestionRepository,
      { increase } as unknown as UserPhilosopherCountRepository,
      {
        findById: jest.fn().mockResolvedValue({ id: '1' }),
      } as unknown as CategoryRepository,
      {
        lockUser: jest.fn().mockResolvedValue(user),
        find: jest.fn().mockImplementation(() => Promise.resolve(session)),
        save: jest.fn().mockImplementation((s: OnboardingSession) => {
          session = s;
          return Promise.resolve();
        }),
      },
      analysis as unknown as AnalysisService,
      daily as unknown as DailyService,
    );
  });
  const start = () => service.selectCategory('external', { categoryId: '1' });
  const submit = (i: number) =>
    service.submitAnswer('external', {
      questionId: String(i),
      answerId: `${i}1`,
      ...(i === 1 ? { followupAnswerId: 'f1' } : {}),
    });
  it('persists the assigned questions and resumes after a completed two-stage question', async () => {
    await start();
    await submit(1);
    questions.reverse();
    expect(
      (await service.getOnboardingQuestions('external')).items.map(
        (q) => q.questionId,
      ),
    ).toEqual(['1', '2', '3', '4', '5']);
    expect(await service.getOnboardingStatus('external')).toMatchObject({
      answeredCount: 1,
      nextQuestionId: '2',
      canViewResult: false,
    });
    expect(increase).toHaveBeenCalledTimes(1);
    expect(saveFollowup).toHaveBeenCalledTimes(1);
  });
  it('resumes a draft at the followup stage without counting it as an answer', async () => {
    await start();
    expect(
      await service.saveDraft('external', { questionId: '1', answerId: '11' }),
    ).toMatchObject({ answeredCount: 0, nextStage: 2, draftAnswerId: '11' });
    expect(saveAnswer).not.toHaveBeenCalled();
    expect(increase).not.toHaveBeenCalled();
    await submit(1);
    expect(await service.getOnboardingStatus('external')).toMatchObject({
      answeredCount: 1,
      nextStage: 1,
      draftAnswerId: null,
    });
  });
  it('rejects skipping, missing/wrong followup, and unrelated choices before any write', async () => {
    await start();
    await expect(submit(2)).rejects.toThrow();
    for (const request of [
      { questionId: '1', answerId: '11' },
      { questionId: '1', answerId: '11', followupAnswerId: 'other' },
      { questionId: '1', answerId: '21', followupAnswerId: 'f1' },
    ])
      await expect(service.submitAnswer('external', request)).rejects.toThrow();
    expect(saveAnswer).not.toHaveBeenCalled();
    expect(increase).not.toHaveBeenCalled();
  });
  it('rejects duplicate answers and extra followups on a single-stage question', async () => {
    await start();
    await submit(1);
    await expect(submit(1)).rejects.toThrow();
    await expect(
      service.submitAnswer('external', {
        questionId: '2',
        answerId: '21',
        followupAnswerId: 'f1',
      }),
    ).rejects.toThrow();
    expect(increase).toHaveBeenCalledTimes(1);
  });
  it('requires five answers and result before completion, defaults to 08:00, and completion retries are idempotent', async () => {
    await start();
    await expect(service.getResult('external')).rejects.toThrow();
    await expect(
      service.registerDailyTime('external', { timezone: 'Asia/Seoul' }),
    ).rejects.toThrow();
    for (let i = 1; i <= 5; i++) await submit(i);
    await expect(submit(5)).rejects.toThrow();
    await expect(
      service.registerDailyTime('external', { timezone: 'Asia/Seoul' }),
    ).rejects.toThrow();
    expect(await service.getResult('external')).toMatchObject({
      summary: { status: 'pending' },
    });
    expect(
      await service.registerDailyTime('external', { timezone: 'Asia/Seoul' }),
    ).toMatchObject({
      dailyQuestionTime: '08:00',
      onboardingStatus: OnboardingStatus.COMPLETE,
    });
    await service.registerDailyTime('external', {
      dailyQuestionTime: '09:00',
      timezone: 'UTC',
    });
    expect(user.dailyQuestionTime).toBe('08:00');
    expect(daily.assignFirstQuestion).toHaveBeenCalledTimes(1);
    expect(daily.assignFirstQuestion).toHaveBeenCalledWith('external');
    await expect(submit(1)).rejects.toThrow();
  });
  it('rejects incomplete pools and changing a category after assignment', async () => {
    questions.pop();
    await expect(start()).rejects.toThrow();
    expect(session).toBeNull();
  });
  it('allows same-category retries but prevents replacing an assigned pool', async () => {
    await start();
    await start();
    await expect(
      service.selectCategory('external', { categoryId: '2' }),
    ).rejects.toThrow();
    expect(session?.questionIds).toHaveLength(5);
  });
  it('rejects suspended users even when called outside HTTP', async () => {
    user.userStatus = UserStatus.SUSPENDED;
    await expect(start()).rejects.toThrow();
  });
});
