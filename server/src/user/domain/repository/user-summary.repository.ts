import { UserSummary, UserSummaryInsight } from '../model/user-summary.entity';

export const USER_SUMMARY_REPOSITORY = Symbol('USER_SUMMARY_REPOSITORY');

export interface UserSummaryRepository {
  findByUserId(userId: string): Promise<UserSummary | null>;

  upsertAnalysis(
    userId: string,
    nearestPhilosopherId: string,
    overallSummaries: UserSummaryInsight[],
    contradictions: UserSummaryInsight[],
    accuracy: number,
  ): Promise<UserSummary>;
}
