import { UserSummary, UserSummaryInsight } from '../model/user-summary.entity';

export const USER_SUMMARY_REPOSITORY = Symbol('USER_SUMMARY_REPOSITORY');

export interface UserSummaryRepository {
  ensureSnapshot(
    userId: string,
    nearestId: string,
    fingerprint: string,
    accuracy: number,
  ): Promise<UserSummary>;
  claim(
    userId: string,
    fingerprint: string,
    token: string,
    now: Date,
  ): Promise<boolean>;
  finish(
    userId: string,
    fingerprint: string,
    token: string,
    result: {
      overallSummaries: UserSummaryInsight[];
      contradictions: UserSummaryInsight[];
    } | null,
  ): Promise<boolean>;
  findByUserId(userId: string): Promise<UserSummary | null>;
}
