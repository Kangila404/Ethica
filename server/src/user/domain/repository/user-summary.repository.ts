import { UserSummary } from '../model/user-summary.entity';

export const USER_SUMMARY_REPOSITORY = Symbol('USER_SUMMARY_REPOSITORY');

export interface UserSummaryRepository {
  findByUserId(userId: string): Promise<UserSummary | null>;

  save(userSummary: UserSummary): Promise<UserSummary>;
}
