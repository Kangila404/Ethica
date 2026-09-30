import { dailyBoundary, dailyDate, nextDailyBoundary } from './daily-clock';

describe('daily wall-clock schedule', () => {
  it('retains yesterday until the local configured time', () => {
    const now = new Date('2026-09-30T22:59:59Z');
    expect(
      dailyDate(dailyBoundary(now, '08:00', 'Asia/Seoul'), 'Asia/Seoul'),
    ).toBe('2026-09-30');
    expect(nextDailyBoundary(now, '08:00', 'Asia/Seoul').toISOString()).toBe(
      '2026-09-30T23:00:00.000Z',
    );
  });
  it('advances exactly at the boundary', () => {
    const now = new Date('2026-09-30T23:00:00Z');
    expect(dailyBoundary(now, '08:00', 'Asia/Seoul')).toEqual(now);
    expect(nextDailyBoundary(now, '08:00', 'Asia/Seoul').toISOString()).toBe(
      '2026-10-01T23:00:00.000Z',
    );
  });
  it('moves a nonexistent spring clock time forward', () => {
    expect(
      nextDailyBoundary(
        new Date('2026-03-08T05:00:00Z'),
        '02:30',
        'America/New_York',
      ).toISOString(),
    ).toBe('2026-03-08T07:30:00.000Z');
  });
  it('does not generate a second cycle during the repeated autumn hour', () => {
    expect(
      nextDailyBoundary(
        new Date('2026-11-01T06:15:00Z'),
        '01:30',
        'America/New_York',
      ).toISOString(),
    ).toBe('2026-11-02T06:30:00.000Z');
  });
  it("uses the next local date for a changed schedule even before today's time", () => {
    expect(
      dailyBoundary(
        new Date('2026-09-30T00:00:00Z'),
        '10:00',
        'Asia/Seoul',
        true,
      ).toISOString(),
    ).toBe('2026-10-01T01:00:00.000Z');
  });
});
