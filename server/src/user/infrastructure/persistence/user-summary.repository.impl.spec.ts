jest.mock('typeorm-transactional', () => ({
  Transactional: () => () => undefined,
}));
import { Repository } from 'typeorm';
import { UserSummaryRepositoryImpl } from './user-summary.repository.impl';
import { UserSummary } from 'src/user/domain/model/user-summary.entity';
describe('summary generation reservation', () => {
  const now = new Date('2026-10-01T12:00:00Z');
  let summary: UserSummary;
  const update = jest.fn();
  const lock = jest.fn();
  let repository: UserSummaryRepositoryImpl;
  beforeEach(() => {
    jest.clearAllMocks();
    summary = Object.assign(new UserSummary(), {
      id: '1',
      userId: '7',
      sourceFingerprint: 'current',
      status: 'pending',
      generationDate: '2026-10-01',
      generationAttempts: 2,
    });
    repository = new UserSummaryRepositoryImpl({
      manager: { getRepository: () => ({ findOneOrFail: lock }) },
      findOne: jest.fn().mockImplementation(() => Promise.resolve(summary)),
      update,
    } as unknown as Repository<UserSummary>);
  });
  it('locks the user and reserves the last slot together with the worker token', async () => {
    expect(await repository.claim('7', 'current', 'worker', now)).toBe(true);
    expect(lock).toHaveBeenCalledWith({
      where: { id: '7' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(update).toHaveBeenCalledWith(
      { id: '1' },
      expect.objectContaining({
        generationAttempts: 3,
        status: 'processing',
        generationToken: 'worker',
      }),
    );
  });
  it('rejects exhausted quota without changing the current generation', async () => {
    summary.generationAttempts = 3;
    await expect(
      repository.claim('7', 'current', 'worker', now),
    ).rejects.toMatchObject({ status: 429 });
    expect(update).not.toHaveBeenCalled();
  });
  it('does not charge cache hits, active workers, or stale input', async () => {
    summary.generationAttempts = 3;
    summary.status = 'ready';
    expect(await repository.claim('7', 'current', 'worker', now)).toBe(false);
    summary.status = 'processing';
    summary.generationStartedAt = now;
    expect(await repository.claim('7', 'current', 'worker', now)).toBe(false);
    summary.status = 'pending';
    expect(await repository.claim('7', 'old', 'worker', now)).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
  it('charges an expired worker retry and starts a new day with one attempt', async () => {
    summary.status = 'processing';
    summary.generationStartedAt = new Date(now.getTime() - 61000);
    summary.generationDate = '2026-09-30';
    summary.generationAttempts = 3;
    expect(await repository.claim('7', 'current', 'worker', now)).toBe(true);
    expect(update).toHaveBeenCalledWith(
      { id: '1' },
      expect.objectContaining({
        generationAttempts: 1,
        generationDate: '2026-10-01',
      }),
    );
  });
});
