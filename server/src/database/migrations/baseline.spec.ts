import { QueryRunner } from 'typeorm';
import { Baseline1790720000000 } from './1790720000000-Baseline';

describe('Production baseline', () => {
  it('refuses a partially initialized database before writing', async () => {
    const query = jest.fn().mockResolvedValue([{ name: 'users' }]);
    await expect(
      new Baseline1790720000000().up({ query } as unknown as QueryRunner),
    ).rejects.toThrow('Incomplete baseline');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('preserves an existing develop baseline without issuing DDL', async () => {
    const query = jest
      .fn()
      .mockResolvedValue(
        [
          'users',
          'user_summary',
          'auth_Identity',
          'auth_challenge',
          'refresh_tokens',
          'category',
          'philosopher',
          'post',
          'post_segment',
          'question',
          'answer',
          'followup_answer',
          'question_category',
          'user_answer',
          'user_followup_answer',
          'user_philosopher_count',
          'user_daily_question',
        ].map((name) => ({ name })),
      );
    await new Baseline1790720000000().up({ query } as unknown as QueryRunner);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
