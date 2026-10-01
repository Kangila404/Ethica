import { generationQuota } from './generation-quota';
describe('daily analysis quota', () => {
  it('resets exactly at midnight in Korea independently of the device timezone', () => {
    const usage = { generationDate: '2026-10-01', generationAttempts: 3 };
    expect(
      generationQuota(usage, new Date('2026-10-01T14:59:59.999Z')),
    ).toMatchObject({ remaining: 0, resetsAt: '2026-10-01T15:00:00.000Z' });
    expect(
      generationQuota(usage, new Date('2026-10-01T15:00:00.000Z')),
    ).toMatchObject({ remaining: 3, date: '2026-10-02' });
  });
  it('gives new users three slots and never returns negative availability', () => {
    expect(generationQuota(null).remaining).toBe(3);
    const now = new Date('2026-10-01T00:00:00Z');
    expect(
      generationQuota(
        { generationDate: '2026-10-01', generationAttempts: 4 },
        now,
      ).remaining,
    ).toBe(0);
  });
});
