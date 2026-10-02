jest.mock('typeorm-transactional', () => ({
  Transactional: () => () => undefined,
}));
import { DailyService } from './daily.service';
import { User } from 'src/user/domain/model/user.entity';
import { UserDailyQuestion } from '../domain/model/user_daily_question.entity';

describe('First daily question after onboarding', () => {
  type Deps = ConstructorParameters<typeof DailyService>;
  let user: User;
  let latest: UserDailyQuestion | null;
  let service: DailyService;
  const questions = { findRandomDailyExcluding: jest.fn() };
  const users = { findByUserId: jest.fn(), save: jest.fn() };
  const cycles = {
    findLatest: jest.fn(),
    findServicedQuestionIds: jest.fn(),
    save: jest.fn(),
  };
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-10-02T06:00:00Z'));
    user = Object.assign(new User(), {
      id: '1',
      userId: 'external',
      userStatus: 'active',
      onboardingStatus: 'complete',
      dailyQuestionTime: '21:00',
      timezone: 'Asia/Seoul',
      nextDailyAt: new Date('2026-10-02T12:00:00Z'),
      notificationEnabled: true,
      fcmToken: 'test-token',
    });
    latest = null;
    users.findByUserId.mockResolvedValue(user);
    cycles.findLatest.mockImplementation(() => Promise.resolve(latest));
    cycles.findServicedQuestionIds.mockResolvedValue([]);
    cycles.save.mockImplementation((cycle: UserDailyQuestion) => {
      latest = cycle;
      return Promise.resolve(cycle);
    });
    questions.findRandomDailyExcluding.mockResolvedValue({ id: '10' });
    service = new DailyService(
      questions as unknown as Deps[0],
      {} as Deps[1],
      users as unknown as Deps[2],
      cycles as unknown as Deps[3],
      {} as Deps[4],
      {} as Deps[5],
      {} as Deps[6],
      {} as Deps[7],
    );
  });
  afterEach(() => jest.useRealTimers());

  it('opens today immediately, skips push, and waits until tomorrow even before the chosen time', async () => {
    await service.assignFirstQuestion('external');
    expect(latest).toMatchObject({
      questionId: '10',
      serviceDate: '2026-10-02',
      openedAt: new Date('2026-10-02T06:00:00Z'),
      status: 'pending',
      notificationStatus: 'skipped',
    });
    expect(user.nextDailyAt).toEqual(new Date('2026-10-03T12:00:00Z'));
    jest.setSystemTime(new Date('2026-10-02T13:00:00Z'));
    await service.assignForToday('external');
    expect(await service.claimNotification('external')).toBeNull();
    expect(cycles.save).toHaveBeenCalledTimes(1);
  });
  it('does not reset an existing assignment or schedule on a retry', async () => {
    await service.assignFirstQuestion('external');
    const first = latest;
    jest.setSystemTime(new Date('2026-10-04T06:00:00Z'));
    await service.assignFirstQuestion('external');
    expect(latest).toBe(first);
    expect(user.nextDailyAt).toEqual(new Date('2026-10-03T12:00:00Z'));
    expect(cycles.save).toHaveBeenCalledTimes(1);
  });
  it('expires the first unanswered question at the next scheduled boundary', async () => {
    await service.assignFirstQuestion('external');
    const first = latest;
    questions.findRandomDailyExcluding.mockResolvedValue({ id: '11' });
    cycles.findServicedQuestionIds.mockResolvedValue(['10']);
    jest.setSystemTime(new Date('2026-10-03T12:00:00Z'));
    await service.assignForToday('external');
    expect(first).toMatchObject({ status: 'expired' });
    expect(latest).toMatchObject({
      questionId: '11',
      serviceDate: '2026-10-03',
      notificationStatus: 'pending',
    });
    expect(questions.findRandomDailyExcluding).toHaveBeenLastCalledWith(['10']);
  });
  it('assigns with notifications disabled and after the chosen time', async () => {
    user.notificationEnabled = false;
    user.dailyQuestionTime = '08:00';
    await service.assignFirstQuestion('external');
    expect(latest).toMatchObject({
      questionId: '10',
      notificationStatus: 'skipped',
    });
    expect(user.nextDailyAt).toEqual(new Date('2026-10-02T23:00:00Z'));
  });
  it('uses local tomorrow through a daylight-saving gap rather than adding 24 hours', async () => {
    jest.setSystemTime(new Date('2026-03-07T23:30:00Z'));
    user.timezone = 'America/New_York';
    user.dailyQuestionTime = '02:30';
    await service.assignFirstQuestion('external');
    expect(latest).toMatchObject({ serviceDate: '2026-03-07' });
    expect(user.nextDailyAt).toEqual(new Date('2026-03-08T07:30:00Z'));
  });
  it('persists preparing without inventing a question when the published pool is empty', async () => {
    questions.findRandomDailyExcluding.mockResolvedValue(null);
    await service.assignFirstQuestion('external');
    expect(latest).toMatchObject({
      questionId: null,
      status: 'preparing',
      notificationStatus: 'skipped',
    });
    await service.assignFirstQuestion('external');
    expect(cycles.save).toHaveBeenCalledTimes(1);
  });
  it('does not bypass incomplete onboarding', async () => {
    Object.assign(user, { onboardingStatus: 'incomplete' });
    await expect(service.assignFirstQuestion('external')).rejects.toThrow();
    expect(cycles.save).not.toHaveBeenCalled();
  });
});
