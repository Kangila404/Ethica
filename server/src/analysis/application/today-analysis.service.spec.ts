jest.mock('typeorm-transactional', () => ({
  Transactional: () => () => undefined,
}));
import { TodayAnalysisService } from './today-analysis.service';
import { DailyService } from 'src/daily/application/daily.service';
import { UserRepository } from 'src/user/domain/repository/user.repository';
import { UserPhilosopherCountRepository } from 'src/philosopher/domain/repository/user-philosopher-count.repository';
import { Repository } from 'typeorm';
import { Philosopher } from 'src/philosopher/domain/model/philosopher.entity';

describe('TodayAnalysisService', () => {
  const daily = { getDaily: jest.fn() };
  const users = { findByUserId: jest.fn() };
  const counts = { findByUserId: jest.fn() };
  const philosophers = { findBy: jest.fn() };
  let service: TodayAnalysisService;
  beforeEach(() => {
    jest.resetAllMocks();
    daily.getDaily.mockResolvedValue({
      userDailyQuestion: 'completed',
      serviceDate: '2026-09-29',
      nextDailyAt: new Date('2026-09-30T23:00:00Z'),
      selectedAnswer: { philosopherId: '2' },
      selectedFollowupAnswer: { id: '99' },
    });
    users.findByUserId.mockResolvedValue({ id: '7' });
    counts.findByUserId.mockResolvedValue([
      { philosopherId: '1', count: 2 },
      { philosopherId: '2', count: 3 },
    ]);
    philosophers.findBy.mockResolvedValue([
      { id: '1', name: '칸트', school: '의무론', imageKey: null },
      { id: '2', name: '밀', school: '공리주의', imageKey: null },
    ]);
    service = new TodayAnalysisService(
      daily as unknown as DailyService,
      users as unknown as UserRepository,
      counts as unknown as UserPhilosopherCountRepository,
      philosophers as unknown as Repository<Philosopher>,
    );
  });
  it('compares integer counts and detects a new nearest philosopher, excluding followup', async () => {
    const result = await service.getToday('external-user');
    expect(daily.getDaily).toHaveBeenCalledWith('external-user');
    expect(counts.findByUserId).toHaveBeenCalledWith('7');
    expect(result).toMatchObject({
      status: 'completed',
      serviceDate: '2026-09-29',
      nearestChanged: true,
      before: { answerCount: 4, nearestPhilosopher: { id: '1' } },
      after: { answerCount: 5, nearestPhilosopher: { id: '2' } },
      changes: [
        {
          philosopherId: '2',
          beforePercent: 50,
          afterPercent: 60,
          deltaPercentagePoints: 10,
        },
        {
          philosopherId: '1',
          beforePercent: 50,
          afterPercent: 40,
          deltaPercentagePoints: -10,
        },
      ],
    });
    // Repeated reads do not change counts.
    expect(await service.getToday('external-user')).toEqual(result);
  });
  it.each(['pending', 'preparing', 'waiting'])(
    'returns %s without a fabricated comparison',
    async (status) => {
      daily.getDaily.mockResolvedValue({
        userDailyQuestion: status,
        nextDailyAt: null,
      });
      expect(await service.getToday('u')).toMatchObject({
        status,
        serviceDate: null,
        before: null,
        after: null,
        selectedPhilosopher: null,
        changes: [],
        nearestChanged: false,
      });
      expect(counts.findByUserId).not.toHaveBeenCalled();
    },
  );
  it('has an empty baseline for the first ever answer, without claiming a philosopher switch', async () => {
    counts.findByUserId.mockResolvedValue([{ philosopherId: '2', count: 1 }]);
    philosophers.findBy.mockResolvedValue([
      { id: '2', name: '밀', school: '공리주의', imageKey: null },
    ]);
    expect(await service.getToday('u')).toMatchObject({
      before: { answerCount: 0, nearestPhilosopher: null, composition: [] },
      after: { answerCount: 1 },
      nearestChanged: false,
      changes: [
        { beforePercent: 0, afterPercent: 100, deltaPercentagePoints: 100 },
      ],
    });
  });
  it('introduces a new philosopher with zero before share and preserves rounded totals', async () => {
    counts.findByUserId.mockResolvedValue([
      { philosopherId: '1', count: 2 },
      { philosopherId: '2', count: 1 },
    ]);
    const r = await service.getToday('u');
    expect(r.changes.find((c) => c.philosopherId === '2')).toMatchObject({
      beforePercent: 0,
      afterPercent: 33.3,
    });
    expect(r.before!.composition.reduce((n, c) => n + c.percent, 0)).toBe(100);
    expect(r.after!.composition.reduce((n, c) => n + c.percent, 0)).toBe(100);
    expect(r.nearestChanged).toBe(false);
  });
  it('rejects inconsistent counts rather than inventing a negative baseline', async () => {
    counts.findByUserId.mockResolvedValue([{ philosopherId: '1', count: 2 }]);
    await expect(service.getToday('u')).rejects.toThrow('오늘 분석 집계');
  });
  it('propagates the daily access check and never reads another aggregate after denial', async () => {
    daily.getDaily.mockRejectedValue(new Error('forbidden'));
    await expect(service.getToday('u')).rejects.toThrow('forbidden');
    expect(counts.findByUserId).not.toHaveBeenCalled();
  });
});
