jest.mock('typeorm-transactional', () => ({
  Transactional: () => () => undefined,
}));
import { DailyService } from './daily.service';
import { UserDailyQuestion } from '../domain/model/user_daily_question.entity';
import { DailyQuestionStatus } from '../domain/enums/daily-question-status.enum';
import { QuestionType } from 'src/question/domain/enum/question-type.enum';

describe('Mandatory daily followup', () => {
  type Deps = ConstructorParameters<typeof DailyService>;
  let cycle: UserDailyQuestion;
  let service: DailyService;
  const question = {
    findById: jest.fn(),
    findByIdWithAnswers: jest.fn(),
    findRandomDailyExcluding: jest.fn(),
  };
  const answers = { findById: jest.fn() };
  const users = { findByUserId: jest.fn(), save: jest.fn() };
  const cycles = {
    findLatest: jest.fn(),
    save: jest.fn(),
    findServicedQuestionIds: jest.fn(),
  };
  const records = { save: jest.fn() };
  const followups = { findById: jest.fn() };
  const followupRecords = { save: jest.fn() };
  const counts = { increase: jest.fn() };
  const first = { questionId: '10', answerId: '20' };
  const second = { questionId: '10', followupAnswerId: '30' };
  beforeEach(() => {
    jest.resetAllMocks();
    cycle = Object.assign(new UserDailyQuestion(), {
      id: '5',
      userId: '1',
      questionId: '10',
      serviceDate: '2026-09-30',
      status: DailyQuestionStatus.PENDING,
      answerId: null,
      followupAnswerId: null,
    });
    users.findByUserId.mockResolvedValue({
      id: '1',
      userStatus: 'active',
      onboardingStatus: 'complete',
      nextDailyAt: new Date('2099-01-01'),
    });
    cycles.findLatest.mockImplementation(() => Promise.resolve(cycle));
    cycles.findServicedQuestionIds.mockResolvedValue(['10']);
    question.findById.mockResolvedValue({
      id: '10',
      type: QuestionType.TWO_STAGE,
    });
    question.findByIdWithAnswers.mockResolvedValue({
      id: '10',
      type: QuestionType.TWO_STAGE,
      stage1Body: '첫 질문',
      followupBody: '후속 질문',
      answers: [
        { id: '20', questionId: '10', philosopherId: '3', body: '첫 선택' },
      ],
      followupAnswers: [{ id: '30', body: '후속 선택' }],
    });
    answers.findById.mockResolvedValue({
      id: '20',
      questionId: '10',
      philosopherId: '3',
      explanation: '해설',
    });
    followups.findById.mockResolvedValue({
      id: '30',
      questionId: '10',
      explanation: '후속 해설',
    });
    service = new DailyService(
      question as unknown as Deps[0],
      answers as unknown as Deps[1],
      users as unknown as Deps[2],
      cycles as unknown as Deps[3],
      records as unknown as Deps[4],
      followups as unknown as Deps[5],
      followupRecords as unknown as Deps[6],
      counts as unknown as Deps[7],
    );
  });
  it('saves a draft, resumes followup on reload, and aggregates only after both answers', async () => {
    expect(await service.submitStageOne('u', first)).toMatchObject({
      aggregated: false,
      requiresApp: true,
    });
    expect(cycle.status).toBe('pending');
    expect(records.save).not.toHaveBeenCalled();
    expect(counts.increase).not.toHaveBeenCalled();
    expect(await service.getDaily('u')).toMatchObject({
      userDailyQuestion: 'pending',
      requiresFollowup: true,
      selectedAnswerId: '20',
      followupAnswers: [{ id: '30', body: '후속 선택' }],
    });
    await service.submitStageTwo('u', second);
    expect(cycle.status).toBe('completed');
    expect(records.save).toHaveBeenCalledTimes(1);
    expect(followupRecords.save).toHaveBeenCalledTimes(1);
    expect(counts.increase).toHaveBeenCalledWith('1', '3');
  });
  it('keeps duplicate submissions idempotent at either stage', async () => {
    await service.submitStageOne('u', first);
    await service.submitStageOne('u', first);
    expect(records.save).not.toHaveBeenCalled();
    await service.submitStageTwo('u', second);
    await service.submitStageTwo('u', second);
    expect(await service.submitStageOne('u', first)).toMatchObject({
      aggregated: true,
      requiresApp: false,
    });
    expect(records.save).toHaveBeenCalledTimes(1);
    expect(counts.increase).toHaveBeenCalledTimes(1);
    expect(followupRecords.save).toHaveBeenCalledTimes(1);
  });
  it('rejects a followup without a first choice and foreign followup choices', async () => {
    await expect(service.submitStageTwo('u', second)).rejects.toThrow();
    await service.submitStageOne('u', first);
    followups.findById.mockResolvedValue({ id: '30', questionId: '999' });
    await expect(service.submitStageTwo('u', second)).rejects.toThrow();
    expect(counts.increase).not.toHaveBeenCalled();
    expect(cycle.status).toBe('pending');
  });
  it('continues to complete a single-stage question immediately', async () => {
    question.findById.mockResolvedValue({
      id: '10',
      type: QuestionType.SINGLE,
    });
    expect(await service.submitStageOne('u', first)).toMatchObject({
      aggregated: true,
      requiresApp: false,
    });
    expect(cycle.status).toBe('completed');
    expect(counts.increase).toHaveBeenCalledTimes(1);
  });
  it('does not aggregate previously completed legacy cycles again', async () => {
    cycle.status = DailyQuestionStatus.COMPLETED;
    cycle.answerId = '20';
    await service.submitStageTwo('u', second);
    expect(records.save).not.toHaveBeenCalled();
    expect(counts.increase).not.toHaveBeenCalled();
  });
  it('expires an unfinished draft without creating history or counts', async () => {
    await service.submitStageOne('u', first);
    users.findByUserId.mockResolvedValue({
      id: '1',
      userStatus: 'active',
      onboardingStatus: 'complete',
      nextDailyAt: new Date('2000-01-01'),
    });
    question.findRandomDailyExcluding.mockResolvedValue(null);
    expect(await service.getDaily('u')).toMatchObject({
      userDailyQuestion: 'preparing',
    });
    expect(cycle.status).toBe('expired');
    expect(records.save).not.toHaveBeenCalled();
    expect(counts.increase).not.toHaveBeenCalled();
  });
});
